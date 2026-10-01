// Loads the starting configuration and the first superadmin (see bootstrap.ts).
// Production does the same at server start. Safe to run repeatedly.
//
//   pnpm db:seed            configuration + superadmin from BOOTSTRAP_SUPERADMIN_EMAIL
//   pnpm db:seed --demo     also demo staff, rules and rosters (development only)
import { eq, sql } from "drizzle-orm";
import { hashPin, normalizeNickname } from "@/lib/auth/pin";
import { env } from "@/lib/env";
import { addDaysIso, todayIso, weekStartIso } from "@/lib/time";
import { seedConfiguration, seedSuperadmin } from "./bootstrap";
import { createDb, type Db } from "./client";
import { areas, assignments, memberG2Locks, memberPatterns, members, rosterWeeks, shifts } from "./schema";

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
      set: { pinHash: sql`excluded.pin_hash`, active: true, failedPinAttempts: 0, pinLockedUntil: null },
    });
  console.info(`[seed] demo staff "${DEMO_STAFF.nickname}" ready (PIN is in src/lib/db/seed.ts)`);
}

/** Fictional staff for trying the roster pages. Development only. */
const DEMO_TEAM = {
  lab: ["Andi", "Bima", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi", "Indah", "Joko", "Kiki"],
  studio: ["Lutfi", "Maya", "Nanda", "Oki"],
  pkl: ["Putra", "Qori"],
} as const;

async function seedDemoRoster(db: Db) {
  for (const [pool, names] of Object.entries(DEMO_TEAM) as [keyof typeof DEMO_TEAM, readonly string[]][]) {
    for (const nickname of names) {
      await db
        .insert(members)
        .values({ nickname, nicknameNormalized: normalizeNickname(nickname), fullName: `${nickname} (demo)`, role: "staff", pool })
        .onConflictDoNothing();
    }
  }

  const memberId = new Map(
    (await db.select({ id: members.id, nickname: members.nicknameNormalized }).from(members)).map((m) => [m.nickname, m.id]),
  );
  const areaId = new Map((await db.select({ id: areas.id, code: areas.code }).from(areas)).map((a) => [a.code, a.id]));
  const shiftId = new Map((await db.select({ id: shifts.id, code: shifts.code }).from(shifts)).map((s) => [s.code, s.id]));
  const id = (nickname: string) => memberId.get(normalizeNickname(nickname))!;

  const lab = [DEMO_STAFF.nickname, ...DEMO_TEAM.lab];
  const floors = ["g2-l23", "g2-l4", "g7-l3", "g7-l4", "g7-l5", "g7-l6"];
  const thisWeek = weekStartIso(todayIso());

  // Rules for the generator, only for members that have none yet: half the lab
  // team on each shift (swapping daily), a fixed studio, PKL alternating
  // buildings, one G7-only member and one Friday G2 lock.
  const [hasRules] = await db.select({ memberId: memberPatterns.memberId }).from(memberPatterns).limit(1);
  if (!hasRules) {
    const patterns: (typeof memberPatterns.$inferInsert)[] = [];
    for (let weekday = 1; weekday <= 5; weekday++) {
      lab.forEach((nickname, i) =>
        patterns.push({ memberId: id(nickname), weekday, shiftId: shiftId.get((i + weekday) % 2 === 0 ? "pagi" : "siang")!, areaId: null }),
      );
      DEMO_TEAM.studio.forEach((nickname, i) =>
        patterns.push({ memberId: id(nickname), weekday, shiftId: shiftId.get(i < 2 ? "pagi" : "siang")!, areaId: areaId.get("studio-g2")! }),
      );
      for (const nickname of DEMO_TEAM.pkl) {
        patterns.push({
          memberId: id(nickname),
          weekday,
          shiftId: shiftId.get(weekday % 2 === 1 ? "pagi" : "siang")!,
          areaId: areaId.get(weekday % 2 === 1 ? "g2" : "g7")!,
        });
      }
    }
    await db.insert(memberPatterns).values(patterns);
    await db.update(members).set({ maxG2PerWeek: 0 }).where(eq(members.id, id("Kiki")));
    await db.insert(memberG2Locks).values({ memberId: id("Joko"), weekday: 5 });
    console.info(`[seed] demo rules (${patterns.length} pattern rows)`);
  }

  for (const weekStart of [addDaysIso(thisWeek, -7), thisWeek]) {
    const [existing] = await db.select({ id: rosterWeeks.id }).from(rosterWeeks).where(eq(rosterWeeks.weekStart, weekStart));
    if (existing) continue;

    const [week] = await db
      .insert(rosterWeeks)
      .values({ weekStart, mode: "lecture", status: "published", source: "manual", publishedAt: new Date() })
      .returning({ id: rosterWeeks.id });

    const rows: (typeof assignments.$inferInsert)[] = [];
    for (let day = 0; day < 5; day++) {
      const date = addDaysIso(weekStart, day);
      const seat = (nickname: string, area: string, shift: string, position = 1) =>
        rows.push({ rosterWeekId: week.id, date, memberId: id(nickname), areaId: areaId.get(area)!, shiftId: shiftId.get(shift)!, position });

      seat("Lutfi", "studio-g2", "pagi", 1);
      seat("Maya", "studio-g2", "pagi", 2);
      seat("Nanda", "studio-g2", "siang", 1);
      seat("Oki", "studio-g2", "siang", 2);

      // Rotate lab staff through the floors and shifts day by day.
      const rotated = [...lab.slice(day * 2), ...lab.slice(0, day * 2)];
      floors.forEach((floor, i) => {
        seat(rotated[i], floor, "pagi");
        seat(rotated[i + floors.length], floor, "siang");
      });

      const pklBuilding = day % 2 === 0 ? "g2" : "g7";
      const pklShift = day % 2 === 0 ? "pagi" : "siang";
      DEMO_TEAM.pkl.forEach((nickname, i) => seat(nickname, pklBuilding, pklShift, i + 1));
    }
    await db.insert(assignments).values(rows);
    console.info(`[seed] demo roster for week ${weekStart} (${rows.length} assignments)`);
  }
}

async function main() {
  const { db, client } = createDb(env().DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await seedConfiguration(db);
    await seedSuperadmin(db, { email: env().BOOTSTRAP_SUPERADMIN_EMAIL, nickname: env().BOOTSTRAP_SUPERADMIN_NICKNAME });
    if (process.argv.includes("--demo")) {
      await seedDemo(db);
      await seedDemoRoster(db);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
