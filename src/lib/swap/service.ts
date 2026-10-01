import "server-only";
import { and, desc, eq, exists, gt, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { cache } from "react";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { Db, Executor } from "@/lib/db/client";
import { areas, assignments, members, rosterWeeks, shifts, swapRequests } from "@/lib/db/schema";
import { getEditorAssignments, seatsFor } from "@/lib/roster/service";
import { loadWeekRules } from "@/lib/roster/week-rules";
import { validateRoster } from "@/lib/roster/validate";
import { addDaysIso, todayIso, weekDates } from "@/lib/time";
import {
  ACTIVE_STATUSES,
  FINISHED_STATUSES,
  isPastDeadline,
  poolCanSwap,
  seatBlockReason,
  seatLabel,
  seatsChanged,
  swapBlockReason,
  type SwapSide,
  type SwapStatus,
} from "./rules";

// Shift swaps: the requester asks, the target accepts or declines, then one
// admin approves (seats are exchanged) or rejects. Callers check sign-in and
// role; this module checks who may act on which request.

/** A rule was broken; the message is meant for the user. */
export class SwapError extends Error {}

const OVERDUE_NOTE = "Lewat batas waktu (H-1 pukul 23.59).";
const CHANGED_NOTE = "Roster berubah setelah permintaan dibuat.";

/** Requests still in progress (they lock both seats). */
const activeSwap = inArray(swapRequests.status, [...ACTIVE_STATUSES]);
const finishedSwap = inArray(swapRequests.status, [...FINISHED_STATUSES]);

/** Requests on any of these seats: assignment ids, or the assignment column of an outer query. */
function touchesSeats(ids: number[] | AnyPgColumn) {
  return Array.isArray(ids)
    ? or(inArray(swapRequests.requesterAssignmentId, ids), inArray(swapRequests.targetAssignmentId, ids))
    : or(eq(swapRequests.requesterAssignmentId, ids), eq(swapRequests.targetAssignmentId, ids));
}

/** Closes active requests whose day has started. Cheap; called before reads and writes. */
export async function expireOverdueSwaps(now: Date = new Date()) {
  await db
    .update(swapRequests)
    .set({ status: "expired", note: OVERDUE_NOTE, decidedAt: now })
    .where(and(activeSwap, lte(swapRequests.date, todayIso(now))));
}

/** A seat, plus whether it is tied up in an active request. */
export type SeatInfo = SwapSide & { nickname: string; active: boolean; areaName: string; shiftLabel: string; position: number; locked: boolean };

async function loadSeats(executor: Executor | Db, where: SQL | undefined, orderBy?: AnyPgColumn): Promise<SeatInfo[]> {
  const query = executor
    .select({
      assignmentId: assignments.id,
      memberId: assignments.memberId,
      date: assignments.date,
      rosterWeekId: assignments.rosterWeekId,
      areaId: assignments.areaId,
      shiftId: assignments.shiftId,
      position: assignments.position,
      pool: members.pool,
      nickname: members.nickname,
      active: members.active,
      weekMode: rosterWeeks.mode,
      weekStatus: rosterWeeks.status,
      areaName: areas.name,
      shiftLabel: shifts.label,
      locked: exists(
        executor.select({ id: swapRequests.id }).from(swapRequests).where(and(activeSwap, touchesSeats(assignments.id))),
      ).mapWith(Boolean),
    })
    .from(assignments)
    .innerJoin(members, eq(assignments.memberId, members.id))
    .innerJoin(rosterWeeks, eq(assignments.rosterWeekId, rosterWeeks.id))
    .innerJoin(areas, eq(assignments.areaId, areas.id))
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .where(where);
  const rows = await (orderBy ? query.orderBy(orderBy) : query);
  return rows.map(({ weekStatus, ...seat }) => ({ ...seat, weekPublished: weekStatus === "published" }));
}

async function loadSeat(executor: Executor | Db, assignmentId: number): Promise<SeatInfo | null> {
  const [seat] = await loadSeats(executor, eq(assignments.id, assignmentId));
  return seat ?? null;
}

/** The member's seats they can still offer: published lecture weeks, from tomorrow, two weeks ahead. */
export async function myTradableSeats(memberId: number, now: Date = new Date()) {
  const today = todayIso(now);
  const seats = await loadSeats(
    db,
    and(
      eq(assignments.memberId, memberId),
      eq(rosterWeeks.status, "published"),
      eq(rosterWeeks.mode, "lecture"),
      gt(assignments.date, today),
      lte(assignments.date, addDaysIso(today, 14)),
    ),
    assignments.date,
  );
  return seats.filter((s) => poolCanSwap(s.pool));
}

const mySeat = alias(assignments, "my_seat");

/** Who the member could trade `assignmentId` with. */
export async function swapCandidates(memberId: number, assignmentId: number, now: Date = new Date()) {
  // Every seat on the same roster day as `assignmentId`, that seat included.
  const sameDay = await loadSeats(
    db,
    exists(
      db
        .select({ id: mySeat.id })
        .from(mySeat)
        .where(
          and(eq(mySeat.id, assignmentId), eq(mySeat.rosterWeekId, assignments.rosterWeekId), eq(mySeat.date, assignments.date)),
        ),
    ),
  );
  const mine = sameDay.find((s) => s.assignmentId === assignmentId);
  if (!mine || mine.memberId !== memberId) return null;

  return {
    mine: { ...mine, blockReason: seatBlockReason(mine, now) },
    candidates: sameDay
      .filter((s) => s.active && swapBlockReason(mine, s, now) === null)
      .sort((a, b) => a.nickname.localeCompare(b.nickname)),
  };
}

async function lockSeats(tx: Executor, ids: number[]) {
  await tx.select({ id: assignments.id }).from(assignments).where(inArray(assignments.id, ids)).for("update");
}

export async function requestSwap(input: {
  requesterId: number;
  myAssignmentId: number;
  theirAssignmentId: number;
  reason: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await expireOverdueSwaps(now);

  return db.transaction(async (tx) => {
    await lockSeats(tx, [input.myAssignmentId, input.theirAssignmentId]);
    const mine = await loadSeat(tx, input.myAssignmentId);
    const theirs = await loadSeat(tx, input.theirAssignmentId);
    if (!mine || !theirs) throw new SwapError("Shift tidak ditemukan. Roster mungkin baru diubah; muat ulang halaman.");
    if (mine.memberId !== input.requesterId) throw new SwapError("Kamu hanya bisa menukar shift milikmu sendiri.");
    if (!theirs.active) throw new SwapError("Rekan ini sudah tidak aktif.");

    const blocked = swapBlockReason(mine, theirs, now);
    if (blocked) throw new SwapError(blocked);
    if (mine.locked || theirs.locked) {
      throw new SwapError("Salah satu shift ini sedang diproses permintaan lain. Tunggu sampai selesai.");
    }

    const [created] = await tx
      .insert(swapRequests)
      .values({
        rosterWeekId: mine.rosterWeekId,
        date: mine.date,
        requesterId: mine.memberId,
        requesterAssignmentId: mine.assignmentId,
        requesterAreaId: mine.areaId,
        requesterShiftId: mine.shiftId,
        targetId: theirs.memberId,
        targetAssignmentId: theirs.assignmentId,
        targetAreaId: theirs.areaId,
        targetShiftId: theirs.shiftId,
        reason: input.reason,
      })
      .returning({ id: swapRequests.id });
    await writeAudit(
      {
        actorId: input.requesterId,
        action: "swap.request",
        subject: `swap:${created.id}`,
        detail: { date: mine.date, target: theirs.nickname, from: `${mine.shiftLabel} ${mine.areaName}`, to: `${theirs.shiftLabel} ${theirs.areaName}` },
      },
      tx,
    );
    return created.id;
  });
}

/** The request row, locked, plus whether its seats still look as they did. */
async function lockRequest(tx: Executor, requestId: number) {
  const [request] = await tx.select().from(swapRequests).where(eq(swapRequests.id, requestId)).for("update");
  if (!request) throw new SwapError("Permintaan tidak ditemukan.");
  return request;
}

async function seatsStillMatch(tx: Executor, request: typeof swapRequests.$inferSelect) {
  const ids = [request.requesterAssignmentId, request.targetAssignmentId].filter((id): id is number => id !== null);
  if (ids.length) await lockSeats(tx, ids);
  const current = async (id: number | null) => {
    if (id === null) return null;
    const [row] = await tx
      .select({ memberId: assignments.memberId, areaId: assignments.areaId, shiftId: assignments.shiftId })
      .from(assignments)
      .where(eq(assignments.id, id));
    return row ?? null;
  };
  const [week] = await tx.select({ status: rosterWeeks.status }).from(rosterWeeks).where(eq(rosterWeeks.id, request.rosterWeekId));
  return (
    week?.status === "published" &&
    !seatsChanged(
      {
        snapshot: { memberId: request.requesterId, areaId: request.requesterAreaId, shiftId: request.requesterShiftId },
        current: await current(request.requesterAssignmentId),
      },
      {
        snapshot: { memberId: request.targetId, areaId: request.targetAreaId, shiftId: request.targetShiftId },
        current: await current(request.targetAssignmentId),
      },
    )
  );
}

/**
 * Expires the request when it is overdue or its seats changed, and says why.
 * Runs inside the caller's transaction, which then commits the expiry.
 */
async function expiredReason(tx: Executor, request: typeof swapRequests.$inferSelect, now: Date): Promise<string | null> {
  let note: string | null = null;
  if (isPastDeadline(request.date, now)) note = OVERDUE_NOTE;
  else if (!(await seatsStillMatch(tx, request))) note = CHANGED_NOTE;
  if (note) await tx.update(swapRequests).set({ status: "expired", note, decidedAt: now }).where(eq(swapRequests.id, request.id));
  return note;
}

export async function respondToSwap(input: { requestId: number; memberId: number; accept: boolean; now?: Date }) {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const request = await lockRequest(tx, input.requestId);
    if (request.targetId !== input.memberId) throw new SwapError("Permintaan ini bukan untukmu.");
    if (request.status !== "awaiting_target") throw new SwapError("Permintaan ini sudah tidak menunggu jawabanmu.");

    const expired = await expiredReason(tx, request, now);
    if (expired) return { expired };

    await tx
      .update(swapRequests)
      .set(
        input.accept
          ? { status: "awaiting_admin", targetRespondedAt: now }
          : { status: "declined", targetRespondedAt: now, decidedBy: input.memberId, decidedAt: now },
      )
      .where(eq(swapRequests.id, request.id));
    await writeAudit(
      { actorId: input.memberId, action: input.accept ? "swap.accept" : "swap.decline", subject: `swap:${request.id}` },
      tx,
    );
    return { expired: null };
  });
}

export async function cancelSwap(input: { requestId: number; memberId: number }) {
  await db.transaction(async (tx) => {
    const request = await lockRequest(tx, input.requestId);
    if (request.requesterId !== input.memberId) throw new SwapError("Hanya yang mengajukan yang bisa membatalkan.");
    if (!ACTIVE_STATUSES.includes(request.status)) throw new SwapError("Permintaan ini sudah selesai.");
    await tx.update(swapRequests).set({ status: "cancelled", decidedAt: new Date() }).where(eq(swapRequests.id, request.id));
    await writeAudit({ actorId: input.memberId, action: "swap.cancel", subject: `swap:${request.id}` }, tx);
  });
}

/** An admin approves (seats are exchanged) or rejects. Approval needs the target's acceptance first. */
export async function decideSwap(input: { requestId: number; adminId: number; approve: boolean; note: string | null; now?: Date }) {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const request = await lockRequest(tx, input.requestId);
    if (!ACTIVE_STATUSES.includes(request.status)) throw new SwapError("Permintaan ini sudah selesai.");

    if (!input.approve) {
      await tx
        .update(swapRequests)
        .set({ status: "rejected", note: input.note, decidedBy: input.adminId, decidedAt: now })
        .where(eq(swapRequests.id, request.id));
      await writeAudit({ actorId: input.adminId, action: "swap.reject", subject: `swap:${request.id}`, detail: { note: input.note } }, tx);
      return { expired: null };
    }

    if (request.status !== "awaiting_admin") throw new SwapError("Rekan belum menerima permintaan ini.");
    const expired = await expiredReason(tx, request, now);
    if (expired) return { expired };

    // Exchange the seats, not the members: each keeps their assignment row
    // (and the one-duty-per-day constraint) and takes the other's area, shift
    // and position.
    const requesterSeat = await loadSeat(tx, request.requesterAssignmentId!);
    const targetSeat = await loadSeat(tx, request.targetAssignmentId!);
    await tx
      .update(assignments)
      .set({ areaId: targetSeat!.areaId, shiftId: targetSeat!.shiftId, position: targetSeat!.position })
      .where(eq(assignments.id, requesterSeat!.assignmentId));
    await tx
      .update(assignments)
      .set({ areaId: requesterSeat!.areaId, shiftId: requesterSeat!.shiftId, position: requesterSeat!.position })
      .where(eq(assignments.id, targetSeat!.assignmentId));

    await tx
      .update(swapRequests)
      .set({ status: "approved", note: input.note, decidedBy: input.adminId, decidedAt: now })
      .where(eq(swapRequests.id, request.id));

    // Other requests on these seats were made against the old layout.
    const seatIds = [requesterSeat!.assignmentId, targetSeat!.assignmentId];
    await tx
      .update(swapRequests)
      .set({ status: "expired", note: "Shift sudah ditukar lewat permintaan lain.", decidedAt: now })
      .where(and(activeSwap, touchesSeats(seatIds)));

    const [week] = await tx.select({ weekStart: rosterWeeks.weekStart }).from(rosterWeeks).where(eq(rosterWeeks.id, request.rosterWeekId));
    await writeAudit(
      {
        actorId: input.adminId,
        action: "swap.approve",
        subject: `roster_week:${week.weekStart}`,
        detail: {
          swap: request.id,
          date: request.date,
          [requesterSeat!.nickname]: `${requesterSeat!.shiftLabel} ${requesterSeat!.areaName} → ${targetSeat!.shiftLabel} ${targetSeat!.areaName}`,
          [targetSeat!.nickname]: `${targetSeat!.shiftLabel} ${targetSeat!.areaName} → ${requesterSeat!.shiftLabel} ${requesterSeat!.areaName}`,
        },
      },
      tx,
    );
    return { expired: null };
  });
}

// ─── Reads ───────────────────────────────────────────────────────────────────

const requester = alias(members, "requester");
const target = alias(members, "target");
const decider = alias(members, "decider");
const requesterArea = alias(areas, "requester_area");
const targetArea = alias(areas, "target_area");
const requesterShift = alias(shifts, "requester_shift");
const targetShift = alias(shifts, "target_shift");

export type SwapView = {
  id: number;
  date: string;
  status: SwapStatus;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  requester: { id: number; nickname: string; seat: string; shiftCode: string };
  target: { id: number; nickname: string; seat: string; shiftCode: string };
  decidedBy: string | null;
};

async function listSwaps(where: ReturnType<typeof and>, limit: number): Promise<SwapView[]> {
  const rows = await db
    .select({
      id: swapRequests.id,
      date: swapRequests.date,
      status: swapRequests.status,
      reason: swapRequests.reason,
      note: swapRequests.note,
      createdAt: swapRequests.createdAt,
      decidedAt: swapRequests.decidedAt,
      requesterId: requester.id,
      requesterName: requester.nickname,
      requesterArea: requesterArea.name,
      requesterShift: requesterShift.label,
      requesterShiftCode: requesterShift.code,
      targetId: target.id,
      targetName: target.nickname,
      targetArea: targetArea.name,
      targetShift: targetShift.label,
      targetShiftCode: targetShift.code,
      decidedBy: decider.nickname,
    })
    .from(swapRequests)
    .innerJoin(requester, eq(swapRequests.requesterId, requester.id))
    .innerJoin(target, eq(swapRequests.targetId, target.id))
    .innerJoin(requesterArea, eq(swapRequests.requesterAreaId, requesterArea.id))
    .innerJoin(targetArea, eq(swapRequests.targetAreaId, targetArea.id))
    .innerJoin(requesterShift, eq(swapRequests.requesterShiftId, requesterShift.id))
    .innerJoin(targetShift, eq(swapRequests.targetShiftId, targetShift.id))
    .leftJoin(decider, eq(swapRequests.decidedBy, decider.id))
    .where(where)
    .orderBy(desc(swapRequests.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    status: r.status,
    reason: r.reason,
    note: r.note,
    createdAt: r.createdAt,
    decidedAt: r.decidedAt,
    requester: {
      id: r.requesterId,
      nickname: r.requesterName,
      seat: seatLabel({ shiftLabel: r.requesterShift, areaName: r.requesterArea }),
      shiftCode: r.requesterShiftCode,
    },
    target: {
      id: r.targetId,
      nickname: r.targetName,
      seat: seatLabel({ shiftLabel: r.targetShift, areaName: r.targetArea }),
      shiftCode: r.targetShiftCode,
    },
    decidedBy: r.decidedBy,
  }));
}

export async function swapsForMember(memberId: number) {
  await expireOverdueSwaps();
  const mine = or(eq(swapRequests.requesterId, memberId), eq(swapRequests.targetId, memberId));
  const [incoming, outgoing, waitingForAdmin, history] = await Promise.all([
    listSwaps(and(eq(swapRequests.targetId, memberId), eq(swapRequests.status, "awaiting_target")), 50),
    listSwaps(and(eq(swapRequests.requesterId, memberId), activeSwap), 50),
    listSwaps(and(eq(swapRequests.targetId, memberId), eq(swapRequests.status, "awaiting_admin")), 50),
    listSwaps(and(mine, finishedSwap), 20),
  ]);
  return { incoming, outgoing: [...outgoing, ...waitingForAdmin].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), history };
}

export async function swapsForAdmin() {
  await expireOverdueSwaps();
  const [awaitingAdmin, awaitingTarget, history] = await Promise.all([
    listSwaps(eq(swapRequests.status, "awaiting_admin"), 100),
    listSwaps(eq(swapRequests.status, "awaiting_target"), 100),
    listSwaps(finishedSwap, 30),
  ]);
  return { awaitingAdmin, awaitingTarget, history };
}

/** Badge counts: requests waiting on this member, and (for admins) on any admin. */
export const swapCounts = cache(async (memberId: number, isAdmin: boolean) => {
  const incoming = and(eq(swapRequests.targetId, memberId), eq(swapRequests.status, "awaiting_target"));
  const forAdmin = eq(swapRequests.status, "awaiting_admin");
  const [counts] = await db
    .select({
      incoming: sql`count(*) filter (where ${incoming})`.mapWith(Number),
      awaitingAdmin: sql`count(*) filter (where ${forAdmin})`.mapWith(Number),
    })
    .from(swapRequests)
    .where(and(gt(swapRequests.date, todayIso()), isAdmin ? or(incoming, forAdmin) : incoming));
  return { incoming: counts.incoming, awaitingAdmin: isAdmin ? counts.awaitingAdmin : 0 };
});

/**
 * Rule problems the approval would create (G2 cap, G2 locks), so the admin
 * can decide with them in view. Only problems that are new are returned.
 */
export async function swapPreviewWarnings(requestId: number): Promise<string[]> {
  const [request] = await db.select().from(swapRequests).where(eq(swapRequests.id, requestId));
  if (!request?.requesterAssignmentId || !request.targetAssignmentId) return [];
  const [week] = await db.select().from(rosterWeeks).where(eq(rosterWeeks.id, request.rosterWeekId));
  if (!week || week.mode !== "lecture") return [];

  // Cached per request, so an admin page previewing many requests in one week loads the rules once.
  const [rows, seats, { members: memberInfo, locks }] = await Promise.all([
    getEditorAssignments(week.id),
    seatsFor("lecture"),
    loadWeekRules(week.weekStart, "all"),
  ]);
  const check = (list: typeof rows) =>
    validateRoster({ mode: "lecture", dates: weekDates(week.weekStart), seats, members: memberInfo, locks, holidays: new Set(), assignments: list })
      .filter((v) => v.severity !== "info")
      .map((v) => v.message);

  const a = rows.find((r) => r.id === request.requesterAssignmentId);
  const b = rows.find((r) => r.id === request.targetAssignmentId);
  if (!a || !b) return [];
  const swapped = rows.map((r) =>
    r.id === a.id ? { ...r, areaId: b.areaId, shiftId: b.shiftId } : r.id === b.id ? { ...r, areaId: a.areaId, shiftId: a.shiftId } : r,
  );
  const before = new Set(check(rows));
  return check(swapped).filter((message) => !before.has(message));
}
