import "server-only";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { memberG2Locks, members, settings } from "@/lib/db/schema";
import type { Pool } from "@/lib/members/labels";
import { DEFAULT_MAX_G2, MAX_G2_DEFAULT_SETTING } from "./constants";
import type { GenLock } from "./generate";
import { applicableLocks, g2RuleFor } from "./newcomer";
import type { CheckedMember } from "./validate";

// The G2 rules of one roster week (caps, newcomers, locks), shared by the
// generator, the admin editor's validation and the swap preview.

export async function getDefaultMaxG2(): Promise<number> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, MAX_G2_DEFAULT_SETTING));
  return typeof row?.value === "number" ? row.value : DEFAULT_MAX_G2;
}

/**
 * active-pooled: active members with a pool (who the generator places)
 * active:        active members
 * all:           every member, with their real `active` flag
 */
export type WeekRulesScope = "active-pooled" | "active" | "all";

export type WeekRuleMember = CheckedMember & { id: number; pool: Pool | null };

const SCOPE_FILTER = {
  "active-pooled": and(eq(members.active, true), isNotNull(members.pool)),
  active: eq(members.active, true),
  all: undefined,
} as const;

/** Members (by nickname) with their G2 rule for `weekStart`, and the G2 locks that apply to them. */
export const loadWeekRules = cache(
  async (
    weekStart: string,
    scope: WeekRulesScope,
  ): Promise<{ defaultMaxG2: number; members: Map<number, WeekRuleMember>; locks: GenLock[] }> => {
    const [defaultMaxG2, team, allLocks] = await Promise.all([
      getDefaultMaxG2(),
      db
        .select({
          id: members.id,
          nickname: members.nickname,
          pool: members.pool,
          active: members.active,
          maxG2PerWeek: members.maxG2PerWeek,
          startedOn: members.startedOn,
        })
        .from(members)
        .where(SCOPE_FILTER[scope])
        .orderBy(asc(members.nicknameNormalized)),
      db.select().from(memberG2Locks),
    ]);

    const ruleMembers = new Map<number, WeekRuleMember>(
      team.map((m) => [
        m.id,
        { id: m.id, nickname: m.nickname, pool: m.pool, active: m.active, ...g2RuleFor(m, weekStart, defaultMaxG2) },
      ]),
    );
    const locks = applicableLocks(
      allLocks.filter((lock) => ruleMembers.has(lock.memberId)),
      ruleMembers,
    );
    return { defaultMaxG2, members: ruleMembers, locks };
  },
);
