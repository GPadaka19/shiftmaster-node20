import "server-only";
import { and, eq } from "drizzle-orm";
import { parseISO } from "date-fns";
import type { CurrentMember } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { areas, assignments, holidays, rosterWeeks, shifts } from "@/lib/db/schema";
import { weekStartIso } from "@/lib/time";

/** Working hours for admins who are not in the roster. */
export const ADMIN_HOURS = { start: "08:00", end: "16:00" } as const;

export type TodayDuty =
  | { kind: "weekend" }
  | { kind: "holiday"; name: string; description: string | null }
  | { kind: "admin"; label: string | null }
  | { kind: "unpublished" }
  | { kind: "off" }
  | { kind: "duty"; areaName: string; shiftCode: string; shiftLabel: string; start: string; end: string };

/** "06:30:00" → "06:30" */
const hhmm = (time: string) => time.slice(0, 5);

/** What the member does on `today` ("yyyy-MM-dd"), in order of precedence. */
export async function getTodayDuty(member: CurrentMember, today: string): Promise<TodayDuty> {
  const weekday = parseISO(today).getDay();
  if (weekday === 0 || weekday === 6) return { kind: "weekend" };

  const [holiday] = await db.select().from(holidays).where(eq(holidays.date, today));
  if (holiday) return { kind: "holiday", name: holiday.name, description: holiday.description };

  if (member.pool === null) return { kind: "admin", label: member.dutyLabel };

  const [week] = await db
    .select({ id: rosterWeeks.id })
    .from(rosterWeeks)
    .where(and(eq(rosterWeeks.weekStart, weekStartIso(today)), eq(rosterWeeks.status, "published")));
  if (!week) return { kind: "unpublished" };

  const [duty] = await db
    .select({
      areaName: areas.name,
      shiftCode: shifts.code,
      shiftLabel: shifts.label,
      start: shifts.startTime,
      end: shifts.endTime,
    })
    .from(assignments)
    .innerJoin(areas, eq(assignments.areaId, areas.id))
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .where(
      and(eq(assignments.rosterWeekId, week.id), eq(assignments.date, today), eq(assignments.memberId, member.id)),
    );
  if (!duty) return { kind: "off" };

  return { kind: "duty", ...duty, start: hhmm(duty.start), end: hhmm(duty.end) };
}
