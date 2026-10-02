import "server-only";
import { and, asc, eq, inArray, lt, max } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { Executor } from "@/lib/db/client";
import { areas, assignments, memberPatterns, members, rosterWeeks, shifts } from "@/lib/db/schema";
import { getModeOn } from "@/lib/period/queries";
import type { Mode } from "@/lib/period/resolve";
import { addDaysIso, formatWeekRange, weekDates } from "@/lib/time";
import { generateLectureRoster, type GeneratedAssignment, type GeneratorInput, type GenSeat } from "./generate";
import { getRosterSlots } from "./queries";
import { loadWeekRules } from "./week-rules";

// Every roster change goes through here, so the admin pages and the weekly
// cron share the same rules. Callers check permissions; this module does not.

/** A rule was broken; the message is meant for the admin. */
export class RosterError extends Error {}

export { DEFAULT_MAX_G2 } from "./constants";
export { getDefaultMaxG2 } from "./week-rules";
export { weekDates } from "@/lib/time";

export async function getWeekRecord(weekStart: string) {
  const [week] = await db.select().from(rosterWeeks).where(eq(rosterWeeks.weekStart, weekStart));
  return week ?? null;
}

export async function seatsFor(mode: Mode): Promise<GenSeat[]> {
  const slots = await getRosterSlots(mode);
  return slots.map(({ area, shift, capacity }) => ({
    area: { id: area.id, name: area.name, building: area.building, kind: area.kind },
    shift: { id: shift.id, label: shift.label },
    capacity,
  }));
}

/** Members, weekly patterns, G2 locks and lecture seats, as the generator wants them. */
export async function loadGeneratorInput(weekStart: string): Promise<GeneratorInput> {
  const [{ defaultMaxG2, members: team, locks }, seats] = await Promise.all([
    loadWeekRules(weekStart, "active-pooled"),
    seatsFor("lecture"),
  ]);
  const ids = [...team.keys()];

  return {
    dates: weekDates(weekStart),
    members: [...team.values()].map((m) => ({
      id: m.id,
      nickname: m.nickname,
      pool: m.pool!,
      maxG2: m.maxG2 ?? defaultMaxG2,
      stretchMaxG2: m.stretchMaxG2 ?? m.maxG2 ?? defaultMaxG2,
    })),
    patterns: ids.length ? await db.select().from(memberPatterns).where(inArray(memberPatterns.memberId, ids)) : [],
    locks,
    seats,
  };
}

/** The week's row, locked for the transaction when asked. Throws when the week has no roster. */
async function lockWeek(tx: Executor, weekStart: string, { forUpdate }: { forUpdate: boolean }) {
  const query = tx.select().from(rosterWeeks).where(eq(rosterWeeks.weekStart, weekStart));
  const [week] = forUpdate ? await query.for("update") : await query;
  if (!week) throw new RosterError("Roster minggu ini belum ada.");
  return week;
}

/** A hand edit makes a generated week manual. */
async function markManual(tx: Executor, week: typeof rosterWeeks.$inferSelect) {
  if (week.source === "generated") await tx.update(rosterWeeks).set({ source: "manual" }).where(eq(rosterWeeks.id, week.id));
}

/** Replaces every seat of the week, publishing it after when asked. */
async function replaceSeats(
  tx: Executor,
  weekId: number,
  rows: readonly GeneratedAssignment[],
  { publish, actorId }: { publish: boolean; actorId: number | null },
) {
  await tx.delete(assignments).where(eq(assignments.rosterWeekId, weekId));
  if (rows.length) await tx.insert(assignments).values(rows.map((row) => ({ ...row, rosterWeekId: weekId })));
  if (publish) await setPublished(tx, weekId, actorId);
}

/** The week's row, created as a draft when missing. Refuses to touch a published week unless allowed. */
async function weekForWriting(
  tx: Executor,
  weekStart: string,
  mode: Mode,
  { source, actorId, allowPublished }: { source: "generated" | "manual"; actorId: number | null; allowPublished: boolean },
) {
  const [existing] = await tx.select().from(rosterWeeks).where(eq(rosterWeeks.weekStart, weekStart)).for("update");
  if (existing) {
    if (existing.status === "published" && !allowPublished) {
      throw new RosterError(`Roster ${formatWeekRange(weekStart)} sudah terbit. Tarik ke draf dulu sebelum menimpanya.`);
    }
    await tx.update(rosterWeeks).set({ mode, source }).where(eq(rosterWeeks.id, existing.id));
    return existing.id;
  }
  const [created] = await tx
    .insert(rosterWeeks)
    .values({ weekStart, mode, status: "draft", source, createdBy: actorId })
    .returning({ id: rosterWeeks.id });
  return created.id;
}

async function setPublished(tx: Executor, weekId: number, actorId: number | null) {
  await tx.update(rosterWeeks).set({ status: "published", publishedAt: new Date(), publishedBy: actorId }).where(eq(rosterWeeks.id, weekId));
}

/** Generates a lecture week from the rules, replacing a draft's seats. */
export async function generateWeek(weekStart: string, { actorId, publish }: { actorId: number | null; publish: boolean }) {
  const { mode } = await getModeOn(weekStart);
  if (mode !== "lecture") {
    throw new RosterError("Generator hanya untuk masa kuliah. Untuk libur semester, salin dari minggu lalu atau isi manual.");
  }
  const input = await loadGeneratorInput(weekStart);
  if (input.patterns.length === 0) {
    throw new RosterError("Belum ada pola mingguan. Atur pola Pagi/Siang anggota di halaman Aturan.");
  }
  const result = generateLectureRoster(input);

  const weekId = await db.transaction(async (tx) => {
    const id = await weekForWriting(tx, weekStart, mode, { source: "generated", actorId, allowPublished: false });
    await replaceSeats(tx, id, result.assignments, { publish, actorId });
    await writeAudit(
      { actorId, action: "roster.generate", subject: `roster_week:${weekStart}`, detail: { publish, warnings: result.warnings } },
      tx,
    );
    return id;
  });
  return { weekId, warnings: result.warnings };
}

/** Copies another week's seats onto `weekStart`, same weekdays. Both weeks must share a mode. */
export async function copyWeek(fromWeekStart: string, weekStart: string, { actorId, publish }: { actorId: number | null; publish: boolean }) {
  const source = await getWeekRecord(fromWeekStart);
  if (!source) throw new RosterError(`Belum ada roster ${formatWeekRange(fromWeekStart)} untuk disalin.`);
  const { mode } = await getModeOn(weekStart);
  if (source.mode !== mode) {
    throw new RosterError("Minggu sumber punya mode berbeda (kuliah/libur), jadi kursinya tidak sama.");
  }

  const rows = await db.select().from(assignments).where(eq(assignments.rosterWeekId, source.id));
  const offset = Math.round((Date.parse(weekStart) - Date.parse(fromWeekStart)) / 86_400_000);
  const activeIds = new Set(
    (await db.select({ id: members.id }).from(members).where(eq(members.active, true))).map((m) => m.id),
  );

  return db.transaction(async (tx) => {
    const id = await weekForWriting(tx, weekStart, mode, { source: "manual", actorId, allowPublished: false });
    const copies = rows
      .filter((row) => activeIds.has(row.memberId))
      .map((row) => ({
        date: addDaysIso(row.date, offset),
        areaId: row.areaId,
        shiftId: row.shiftId,
        memberId: row.memberId,
        position: row.position,
      }));
    await replaceSeats(tx, id, copies, { publish, actorId });
    await writeAudit(
      { actorId, action: "roster.copy", subject: `roster_week:${weekStart}`, detail: { from: fromWeekStart, publish, seats: copies.length } },
      tx,
    );
    return id;
  });
}

export async function createEmptyWeek(weekStart: string, actorId: number) {
  const { mode } = await getModeOn(weekStart);
  return db.transaction(async (tx) => {
    const id = await weekForWriting(tx, weekStart, mode, { source: "manual", actorId, allowPublished: false });
    await writeAudit({ actorId, action: "roster.create", subject: `roster_week:${weekStart}` }, tx);
    return id;
  });
}

export async function setWeekStatus(weekStart: string, status: "draft" | "published", actorId: number) {
  await db.transaction(async (tx) => {
    const week = await lockWeek(tx, weekStart, { forUpdate: true });
    if (status === "published") await setPublished(tx, week.id, actorId);
    else await tx.update(rosterWeeks).set({ status: "draft", publishedAt: null, publishedBy: null }).where(eq(rosterWeeks.id, week.id));
    await writeAudit(
      { actorId, action: status === "published" ? "roster.publish" : "roster.unpublish", subject: `roster_week:${weekStart}` },
      tx,
    );
  });
}

export async function deleteDraftWeek(weekStart: string, actorId: number) {
  await db.transaction(async (tx) => {
    const [week] = await tx.select().from(rosterWeeks).where(eq(rosterWeeks.weekStart, weekStart)).for("update");
    if (!week) return;
    if (week.status === "published") throw new RosterError("Roster yang sudah terbit tidak bisa dihapus. Tarik ke draf dulu.");
    await tx.delete(rosterWeeks).where(eq(rosterWeeks.id, week.id));
    await writeAudit({ actorId, action: "roster.delete", subject: `roster_week:${weekStart}` }, tx);
  });
}

/**
 * Seats a member. If they already sit somewhere else that day, they move.
 * Works on drafts and published weeks; published changes are live at once.
 */
export async function addToSeat(input: {
  weekStart: string;
  date: string;
  areaId: number;
  shiftId: number;
  memberId: number;
  actorId: number;
}) {
  await db.transaction(async (tx) => {
    const week = await lockWeek(tx, input.weekStart, { forUpdate: true });
    if (!weekDates(input.weekStart).includes(input.date)) throw new RosterError("Tanggal di luar minggu ini.");

    const seat = (await seatsFor(week.mode)).find((s) => s.area.id === input.areaId && s.shift.id === input.shiftId);
    if (!seat) throw new RosterError("Kursi ini tidak ada pada mode roster ini.");

    const [member] = await tx.select({ active: members.active, nickname: members.nickname }).from(members).where(eq(members.id, input.memberId));
    if (!member?.active) throw new RosterError("Anggota tidak ditemukan atau sudah nonaktif.");

    const removed = await tx
      .delete(assignments)
      .where(and(eq(assignments.rosterWeekId, week.id), eq(assignments.date, input.date), eq(assignments.memberId, input.memberId)))
      .returning({ areaId: assignments.areaId, shiftId: assignments.shiftId });

    const atSeat = and(
      eq(assignments.rosterWeekId, week.id),
      eq(assignments.date, input.date),
      eq(assignments.areaId, input.areaId),
      eq(assignments.shiftId, input.shiftId),
    );
    const taken = await tx.select({ position: assignments.position }).from(assignments).where(atSeat);
    if (taken.length >= seat.capacity) throw new RosterError(`${seat.area.name} ${seat.shift.label} sudah penuh.`);
    const used = new Set(taken.map((t) => t.position));
    let position = 1;
    while (used.has(position)) position++;

    await tx.insert(assignments).values({
      rosterWeekId: week.id,
      date: input.date,
      areaId: input.areaId,
      shiftId: input.shiftId,
      memberId: input.memberId,
      position,
    });
    await markManual(tx, week);
    await writeAudit(
      {
        actorId: input.actorId,
        action: "roster.seat.set",
        subject: `roster_week:${input.weekStart}`,
        detail: { date: input.date, member: member.nickname, to: `${seat.area.name} ${seat.shift.label}`, movedFrom: removed[0] ?? null },
      },
      tx,
    );
  });
}

export async function removeFromSeat(input: { weekStart: string; assignmentId: number; actorId: number }) {
  await db.transaction(async (tx) => {
    const week = await lockWeek(tx, input.weekStart, { forUpdate: false });
    const [removed] = await tx
      .delete(assignments)
      .where(and(eq(assignments.id, input.assignmentId), eq(assignments.rosterWeekId, week.id)))
      .returning();
    if (!removed) return;
    await markManual(tx, week);
    await writeAudit(
      {
        actorId: input.actorId,
        action: "roster.seat.clear",
        subject: `roster_week:${input.weekStart}`,
        detail: { date: removed.date, memberId: removed.memberId, areaId: removed.areaId, shiftId: removed.shiftId },
      },
      tx,
    );
  });
}

/** Makes every other day of the week look like `fromDate`. Handy for break weeks. */
export async function copyDayToWeek(input: { weekStart: string; fromDate: string; actorId: number }) {
  const dates = weekDates(input.weekStart);
  if (!dates.includes(input.fromDate)) throw new RosterError("Tanggal di luar minggu ini.");

  await db.transaction(async (tx) => {
    const week = await lockWeek(tx, input.weekStart, { forUpdate: true });
    const source = await tx
      .select()
      .from(assignments)
      .where(and(eq(assignments.rosterWeekId, week.id), eq(assignments.date, input.fromDate)));

    const others = dates.filter((d) => d !== input.fromDate);
    await tx.delete(assignments).where(and(eq(assignments.rosterWeekId, week.id), inArray(assignments.date, others)));
    const copies = others.flatMap((date) =>
      source.map((row) => ({ rosterWeekId: week.id, date, areaId: row.areaId, shiftId: row.shiftId, memberId: row.memberId, position: row.position })),
    );
    if (copies.length) await tx.insert(assignments).values(copies);
    await writeAudit(
      { actorId: input.actorId, action: "roster.copy_day", subject: `roster_week:${input.weekStart}`, detail: { from: input.fromDate } },
      tx,
    );
  });
}

/** Every seat of a week, for the editor. */
export async function getEditorAssignments(weekId: number) {
  return db
    .select({
      id: assignments.id,
      date: assignments.date,
      areaId: assignments.areaId,
      shiftId: assignments.shiftId,
      position: assignments.position,
      memberId: members.id,
      nickname: members.nickname,
      pool: members.pool,
      active: members.active,
      area: { building: areas.building, kind: areas.kind, name: areas.name },
      shiftLabel: shifts.label,
    })
    .from(assignments)
    .innerJoin(members, eq(assignments.memberId, members.id))
    .innerJoin(areas, eq(assignments.areaId, areas.id))
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .where(eq(assignments.rosterWeekId, weekId))
    .orderBy(asc(assignments.date), asc(assignments.position));
}

/** Latest week that has a roster, before `weekStart`. */
export async function previousRosterWeek(weekStart: string) {
  const [row] = await db
    .select({ weekStart: max(rosterWeeks.weekStart) })
    .from(rosterWeeks)
    .where(lt(rosterWeeks.weekStart, weekStart));
  return row?.weekStart ?? null;
}
