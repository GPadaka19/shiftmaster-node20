// Loads the starting configuration: areas, rooms, shifts, seats, settings, and
// the first superadmin. Only adds rows that are missing, so it never undoes
// changes admins made in the app. Safe to run repeatedly.
//
//   pnpm db:seed            configuration + superadmin from BOOTSTRAP_SUPERADMIN_EMAIL
//   pnpm db:seed --demo     also a demo staff account (development only)
import { eq, sql } from "drizzle-orm";
import { hashPin, normalizeNickname } from "@/lib/auth/pin";
import { env } from "@/lib/env";
import { createDb, type Db } from "./client";
import { AREAS, ROOMS, SEATS, SETTINGS, SHIFTS } from "./seed-data";
import { areas, auditLog, members, rooms, seatTemplates, settings, shifts } from "./schema";

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

async function main() {
  const { db, client } = createDb(env().DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await seedConfiguration(db);
    await seedSuperadmin(db);
    if (process.argv.includes("--demo")) await seedDemo(db);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
