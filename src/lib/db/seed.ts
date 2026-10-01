// Loads the starting configuration: areas, rooms, shifts, seats, settings, and
// the first superadmin. Only adds rows that are missing, so it never undoes
// changes admins made in the app. Safe to run repeatedly.
//
//   pnpm db:seed            configuration + superadmin from BOOTSTRAP_SUPERADMIN_EMAIL
//   pnpm db:seed --demo     also a demo staff account (development only)
import { eq, sql } from "drizzle-orm";
import { hashPin, normalizeNickname } from "@/lib/auth/pin";
import { env } from "@/lib/env";
import { addDaysIso, todayIso, weekStartIso } from "@/lib/time";
import { createDb, type Db } from "./client";
import { AREAS, ROOMS, SEATS, SETTINGS, SHIFTS } from "./seed-data";
import {
  areas,
  assignments,
  auditLog,
  members,
  rooms,
  rosterWeeks,
  seatTemplates,
  settings,
  shifts,
} from "./schema";

/** Development-only account for trying the PIN login. */
const DEMO_STAFF = { nickname: "demo", fullName: "Staf Demo", pin: "246810" } as const;

async function seedConfiguration(db: Db) {
  for (const area of AREAS) {
    await db.insert(areas).values(area).onConflictDoNothing({ target: areas.code });
  }
  const areaId = new Map((await db.select({ id: areas.id, code: areas.code }).from(areas)).map((a) => [a.code, a.id]));

  for (const room of ROOMS) {
    const values = {
      code: room.code,
      building: room.building,
      floor: room.floor,
      kind: room.kind,
      areaId: room.area ? areaId.get(room.area)! : null,
      visible: room.visible,
    };
    await db.insert(rooms).values(values).onConflictDoNothing({ target: rooms.code });
  }

  for (const shift of SHIFTS) {
    await db.insert(shifts).values(shift).onConflictDoNothing({ target: shifts.code });
  }
  const shiftId = new Map((await db.select({ id: shifts.id, code: shifts.code }).from(shifts)).map((s) => [s.code, s.id]));

  for (const seat of SEATS) {
    await db
      .insert(seatTemplates)
      .values({ areaId: areaId.get(seat.area)!, shiftId: shiftId.get(seat.shift)!, capacity: seat.capacity })
      .onConflictDoNothing();
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }

  console.info(`[seed] ${AREAS.length} areas, ${ROOMS.length} rooms, ${SHIFTS.length} shifts, ${SEATS.length} seat templates`);
}

async function seedSuperadmin(db: Db) {
  const email = env().BOOTSTRAP_SUPERADMIN_EMAIL?.toLowerCase();
  if (!email) {
    console.info("[seed] BOOTSTRAP_SUPERADMIN_EMAIL is empty; no superadmin created");
    return;
  }

  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.email, email));
  if (existing) {
    console.info("[seed] superadmin already exists");
    return;
  }

  const nickname = env().BOOTSTRAP_SUPERADMIN_NICKNAME ?? email.split("@")[0];
  const [created] = await db
    .insert(members)
    .values({
      nickname,
      nicknameNormalized: normalizeNickname(nickname),
      fullName: nickname,
      email,
      role: "superadmin",
    })
    .returning({ id: members.id });
  await db.insert(auditLog).values({
    actorId: null,
    action: "member.bootstrap",
    subject: `member:${created.id}`,
    detail: { role: "superadmin" },
  });
  console.info(`[seed] superadmin created (member:${created.id})`);
}

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
    await seedSuperadmin(db);
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
