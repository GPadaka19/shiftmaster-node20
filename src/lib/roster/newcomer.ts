import { addDaysIso, isoWeekday, weekStartIso } from "@/lib/time";

// New lab staff work only in building G7 for their first four roster weeks, so
// they learn one building before covering G2. Studio staff are not affected.
// Members without a start date (the team at go-live) are not newcomers.

export const NEWCOMER_WEEKS = 4;

type RuleMember = { pool: string | null; startedOn: string | null; maxG2PerWeek: number | null };

/** The first roster week of someone starting on `startedOn`; a weekend start counts from the next Monday. */
export function firstRosterWeek(startedOn: string): string {
  const monday = weekStartIso(startedOn);
  return isoWeekday(startedOn) >= 6 ? addDaysIso(monday, 7) : monday;
}

/** Friday of the last G7-only week for this roster week, or null when the rule does not apply. */
export function g7OnlyUntil(member: Pick<RuleMember, "pool" | "startedOn">, weekStart: string): string | null {
  if (member.pool !== "lab" || !member.startedOn) return null;
  const lastWeek = addDaysIso(firstRosterWeek(member.startedOn), (NEWCOMER_WEEKS - 1) * 7);
  return weekStart <= lastWeek ? addDaysIso(lastWeek, 4) : null;
}

/**
 * The G2 rule for one member in one roster week: newcomers get a cap of 0
 * (G7 only), other lab staff their own cap or the default.
 */
export function g2RuleFor(member: RuleMember, weekStart: string, defaultMaxG2: number) {
  const until = g7OnlyUntil(member, weekStart);
  if (until) return { maxG2: 0, g7OnlyUntil: until };
  return { maxG2: member.pool === "lab" ? (member.maxG2PerWeek ?? defaultMaxG2) : member.maxG2PerWeek, g7OnlyUntil: null };
}

/** G2 locks that apply this week: a newcomer's lock would contradict their G7-only weeks. */
export function applicableLocks<T extends { memberId: number }>(
  locks: readonly T[],
  members: ReadonlyMap<number, { g7OnlyUntil?: string | null }>,
): T[] {
  return locks.filter((lock) => !members.get(lock.memberId)?.g7OnlyUntil);
}
