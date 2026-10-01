import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { areas, assignments, members, rosterWeeks, seatTemplates, shifts } from "@/lib/db/schema";
import type { AreaInfo } from "@/lib/rooms/group";
import type { RosterWeek, ShiftInfo } from "./view";

/** Working hours for admins who are not in the roster. */
export const ADMIN_HOURS = { start: "08:00", end: "16:00" } as const;

/** "06:30:00" → "06:30" */
const hhmm = (time: string) => time.slice(0, 5);

function toShift(row: typeof shifts.$inferSelect): ShiftInfo {
  return { id: row.id, code: row.code, label: row.label, start: hhmm(row.startTime), end: hhmm(row.endTime), sortOrder: row.sortOrder };
}

/** The published roster of the week starting `weekStart` (a Monday), or null. */
export const getPublishedRosterWeek = cache(async (weekStart: string): Promise<RosterWeek | null> => {
  const [week] = await db
    .select({ id: rosterWeeks.id, weekStart: rosterWeeks.weekStart, mode: rosterWeeks.mode })
    .from(rosterWeeks)
    .where(and(eq(rosterWeeks.weekStart, weekStart), eq(rosterWeeks.status, "published")));
  if (!week) return null;

  const rows = await db
    .select({
      date: assignments.date,
      position: assignments.position,
      area: areas,
      shift: shifts,
      member: { id: members.id, nickname: members.nickname },
    })
    .from(assignments)
    .innerJoin(areas, eq(assignments.areaId, areas.id))
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .innerJoin(members, eq(assignments.memberId, members.id))
    .where(eq(assignments.rosterWeekId, week.id));

  return {
    ...week,
    assignments: rows.map((row) => ({ ...row, area: row.area as AreaInfo, shift: toShift(row.shift) })),
  };
});

/** Every area and shift that has seats in `mode`, i.e. what a roster day can contain. */
export const getRosterSlots = cache(async (mode: "lecture" | "maintenance") => {
  const rows = await db
    .select({ area: areas, shift: shifts, capacity: seatTemplates.capacity })
    .from(seatTemplates)
    .innerJoin(areas, eq(seatTemplates.areaId, areas.id))
    .innerJoin(shifts, eq(seatTemplates.shiftId, shifts.id))
    .where(eq(shifts.mode, mode))
    .orderBy(asc(areas.sortOrder), asc(shifts.sortOrder));
  return rows.map((row) => ({ area: row.area as AreaInfo, shift: toShift(row.shift), capacity: row.capacity }));
});
