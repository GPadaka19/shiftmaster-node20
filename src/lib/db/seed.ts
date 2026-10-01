// Loads the starting configuration, the first superadmin and the starting team (see bootstrap.ts).
// Production does the same at server start. Safe to run repeatedly.
//
//   pnpm db:seed            configuration, superadmin from BOOTSTRAP_SUPERADMIN_EMAIL, starting team
//   pnpm db:seed --demo     also the demo login and example rules (development only)
import { and, count, eq, sql } from "drizzle-orm";
import { hashPin, normalizeNickname } from "@/lib/auth/pin";
import { env } from "@/lib/env";
import { seedConfiguration, seedFirstRoster, seedMembers, seedSuperadmin } from "./bootstrap";
import { createDb, type Db } from "./client";
import { areas, memberPatterns, members, shifts } from "./schema";

/** Development-only account for trying the PIN login. */
const DEMO_STAFF = { nickname: "demo", fullName: "Staf Demo", pin: "191919" } as const;

async function seedDemo(db: Db) {
  if (env().NODE_ENV === "production") throw new Error("--demo is not allowed in production");

  await db
    .insert(members)
    .values({
      nickname: DEMO_STAFF.nickname,
      nicknameNormalized: normalizeNickname(DEMO_STAFF.nickname),
      fullName: DEMO_STAFF.fullName,
      role: "staff",
      pool: "lab",
      pinHash: await hashPin(DEMO_STAFF.pin),
    })
    .onConflictDoUpdate({
      target: members.nicknameNormalized,
      set: { pinHash: sql`excluded.pin_hash`, pinMustChange: false, active: true, failedPinAttempts: 0, pinLockedUntil: null },
    });
  console.info(`[seed] demo staff "${DEMO_STAFF.nickname}" ready (PIN is in src/lib/db/seed.ts)`);
}

/**
 * Example weekly patterns so the roster generator has something to work with
 * in development. Only for members that have none yet; real patterns are set
 * on the rules page.
 */
async function seedDemoRules(db: Db) {
  const staff = await db
    .select({ id: members.id, pool: members.pool, patterns: count(memberPatterns.memberId) })
    .from(members)
    .leftJoin(memberPatterns, eq(memberPatterns.memberId, members.id))
    .where(and(eq(members.role, "staff"), eq(members.active, true)))
    .groupBy(members.id)
    .orderBy(members.id);
  const areaId = new Map((await db.select({ id: areas.id, code: areas.code }).from(areas)).map((a) => [a.code, a.id]));
  const shiftId = new Map((await db.select({ id: shifts.id, code: shifts.code }).from(shifts)).map((s) => [s.code, s.id]));
  const pick = (morning: boolean) => shiftId.get(morning ? "morning" : "afternoon")!;

  // Lab: half on each shift, swapping daily. Studio: half morning, half afternoon.
  // PKL: both together, alternating buildings and shifts.
  const byPool = (pool: string) => staff.filter((m) => m.pool === pool);
  const studio = byPool("studio");
  const patterns: (typeof memberPatterns.$inferInsert)[] = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    byPool("lab").forEach((m, i) => {
      if (m.patterns === 0) patterns.push({ memberId: m.id, weekday, shiftId: pick((i + weekday) % 2 === 0), areaId: null });
    });
    studio.forEach((m, i) => {
      if (m.patterns === 0) {
        patterns.push({ memberId: m.id, weekday, shiftId: pick(i < studio.length / 2), areaId: areaId.get("studio-g2")! });
      }
    });
    for (const m of byPool("pkl")) {
      if (m.patterns === 0) {
        patterns.push({ memberId: m.id, weekday, shiftId: pick(weekday % 2 === 1), areaId: areaId.get(weekday % 2 === 1 ? "g2" : "g7")! });
      }
    }
  }
  if (patterns.length > 0) await db.insert(memberPatterns).values(patterns);
  console.info(`[seed] demo rules (${patterns.length} pattern rows); generate rosters on the Roster admin page`);
}

async function main() {
  const { db, client } = createDb(env().DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await seedConfiguration(db);
    await seedSuperadmin(db, { email: env().BOOTSTRAP_SUPERADMIN_EMAIL, nickname: env().BOOTSTRAP_SUPERADMIN_NICKNAME });
    await seedMembers(db);
    await seedFirstRoster(db);
    if (process.argv.includes("--demo")) {
      await seedDemo(db);
      await seedDemoRules(db);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
