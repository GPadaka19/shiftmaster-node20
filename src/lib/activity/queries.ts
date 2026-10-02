import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityEvents, members } from "@/lib/db/schema";
import { TIME_ZONE } from "@/lib/time";

export type MemberActivity = {
  memberId: number;
  nickname: string;
  role: (typeof members.role.enumValues)[number];
  signIns: number;
  pageViews: number;
  clicks: number;
  /** Days (WIB) with at least one event. */
  activeDays: number;
  lastSeen: Date | null;
};

/** Midnight WIB of an ISO date, as a moment. */
function startOfDayWib(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+07:00`);
}

const count = (kind: (typeof activityEvents.kind.enumValues)[number]) =>
  sql<number>`count(*) filter (where ${activityEvents.kind} = ${kind})`.mapWith(Number);

/** Every active member with their activity since `sinceIso`, most active first. */
export async function activityByMember(sinceIso: string): Promise<MemberActivity[]> {
  const total = sql<number>`count(${activityEvents.id})`.mapWith(Number);
  return db
    .select({
      memberId: members.id,
      nickname: members.nickname,
      role: members.role,
      signIns: count("sign_in"),
      pageViews: count("page_view"),
      clicks: count("click"),
      activeDays: sql<number>`count(distinct (${activityEvents.createdAt} at time zone ${TIME_ZONE})::date)`.mapWith(Number),
      lastSeen: sql<Date | null>`max(${activityEvents.createdAt})`.mapWith((value) => (value ? new Date(value) : null)),
    })
    .from(members)
    .leftJoin(
      activityEvents,
      and(eq(activityEvents.memberId, members.id), gte(activityEvents.createdAt, startOfDayWib(sinceIso))),
    )
    .where(eq(members.active, true))
    .groupBy(members.id)
    .orderBy(desc(total), members.nickname);
}

export type ButtonActivity = { label: string; clicks: number; members: number };

/** The buttons pressed most since `sinceIso`. */
export async function topButtons(sinceIso: string, limit = 10): Promise<ButtonActivity[]> {
  const clicks = sql<number>`count(*)`.mapWith(Number);
  return db
    .select({
      label: activityEvents.label,
      clicks,
      members: sql<number>`count(distinct ${activityEvents.memberId})`.mapWith(Number),
    })
    .from(activityEvents)
    .where(and(eq(activityEvents.kind, "click"), gte(activityEvents.createdAt, startOfDayWib(sinceIso))))
    .groupBy(activityEvents.label)
    .orderBy(desc(clicks), activityEvents.label)
    .limit(limit);
}
