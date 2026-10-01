"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  addToSeat,
  copyDayToWeek,
  copyWeek,
  createEmptyWeek,
  deleteDraftWeek,
  generateWeek,
  removeFromSeat,
  RosterError,
  setWeekStatus,
} from "@/lib/roster/service";
import { isMondayIso } from "@/lib/time";

export type RosterActionResult = { error?: string; success?: string; warnings?: string[] };

function isDuplicateDuty(error: unknown): boolean {
  const cause = ((error as { cause?: unknown })?.cause ?? error) as { code?: string; constraint_name?: string };
  return cause.code === "23505" && cause.constraint_name === "assignments_week_date_member_unique";
}

/** Runs a roster change as an admin and turns rule errors into messages. */
async function run(weekStart: string, change: (actorId: number) => Promise<RosterActionResult | void>): Promise<RosterActionResult> {
  const actor = await requireRole("admin");
  if (!isMondayIso(weekStart)) return { error: "Minggu tidak valid." };
  try {
    const result = (await change(actor.id)) ?? {};
    revalidatePath("/admin/roster");
    revalidatePath("/roster");
    revalidatePath("/");
    return result;
  } catch (error) {
    if (error instanceof RosterError) return { error: error.message };
    if (isDuplicateDuty(error)) return { error: "Anggota ini sudah dijadwalkan di hari itu." };
    throw error;
  }
}

export async function generateDraft(weekStart: string) {
  return run(weekStart, async (actorId) => {
    const { warnings } = await generateWeek(weekStart, { actorId, publish: false });
    return { success: "Draf dibuat dari aturan. Periksa, lalu terbitkan.", warnings };
  });
}

export async function copyFromWeek(weekStart: string, fromWeekStart: string) {
  return run(weekStart, async (actorId) => {
    if (!isMondayIso(fromWeekStart)) return { error: "Minggu sumber tidak valid." };
    await copyWeek(fromWeekStart, weekStart, { actorId, publish: false });
    return { success: "Roster disalin sebagai draf." };
  });
}

export async function createEmpty(weekStart: string) {
  return run(weekStart, async (actorId) => {
    await createEmptyWeek(weekStart, actorId);
  });
}

export async function publishWeek(weekStart: string) {
  return run(weekStart, async (actorId) => {
    await setWeekStatus(weekStart, "published", actorId);
    return { success: "Roster diterbitkan. Staf sekarang bisa melihatnya." };
  });
}

export async function unpublishWeek(weekStart: string) {
  return run(weekStart, async (actorId) => {
    await setWeekStatus(weekStart, "draft", actorId);
    return { success: "Roster ditarik ke draf dan tidak terlihat staf." };
  });
}

export async function deleteDraft(weekStart: string) {
  return run(weekStart, async (actorId) => {
    await deleteDraftWeek(weekStart, actorId);
  });
}

export async function seatMember(weekStart: string, date: string, areaId: number, shiftId: number, memberId: number) {
  return run(weekStart, async (actorId) => {
    await addToSeat({ weekStart, date, areaId, shiftId, memberId, actorId });
  });
}

export async function clearSeat(weekStart: string, assignmentId: number) {
  return run(weekStart, async (actorId) => {
    await removeFromSeat({ weekStart, assignmentId, actorId });
  });
}

export async function copyDay(weekStart: string, fromDate: string) {
  return run(weekStart, async (actorId) => {
    await copyDayToWeek({ weekStart, fromDate, actorId });
    return { success: "Hari disalin ke seluruh minggu." };
  });
}
