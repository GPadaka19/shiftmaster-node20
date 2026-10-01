import { eq } from "drizzle-orm";
import { DEFAULT_PIN } from "@/lib/auth/constants";
import { hashPin, normalizeNickname } from "@/lib/auth/pin";
import type { Db } from "./client";
import { AREAS, MEMBERS, ROOMS, SEATS, SETTINGS, SHIFTS } from "./seed-data";
import { areas, auditLog, members, rooms, seatTemplates, settings, shifts } from "./schema";

// What every install needs before anyone can sign in. Runs at server start in
// production (src/instrumentation.ts) and from `pnpm db:seed`. Only adds rows
// that are missing, so it never undoes changes admins made in the app.

/** Areas, rooms, shifts, seats and settings from seed-data.ts. */
export async function seedConfiguration(db: Db) {
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

/** The first superadmin, so someone can sign in with Google and add the rest. */
export async function seedSuperadmin(db: Db, { email, nickname }: { email?: string; nickname?: string }) {
  const address = email?.toLowerCase();
  if (!address) {
    console.info("[seed] BOOTSTRAP_SUPERADMIN_EMAIL is empty; no superadmin created");
    return;
  }

  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.email, address));
  if (existing) {
    console.info("[seed] superadmin already exists");
    return;
  }

  const name = nickname ?? address.split("@")[0];
  const [created] = await db
    .insert(members)
    .values({ nickname: name, nicknameNormalized: normalizeNickname(name), fullName: name, email: address, role: "superadmin" })
    .returning({ id: members.id });
  await db.insert(auditLog).values({
    actorId: null,
    action: "member.bootstrap",
    subject: `member:${created.id}`,
    detail: { role: "superadmin" },
  });
  console.info(`[seed] superadmin created (member:${created.id})`);
}

const MEMBERS_SEEDED = "members_seeded_at";

/**
 * The starting team from seed-data.ts. Runs once per install: afterwards a
 * renamed or removed member must not come back on the next restart.
 */
export async function seedMembers(db: Db) {
  const [done] = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, MEMBERS_SEEDED));
  if (done) return;

  // Staff start with the default PIN and must choose their own at first sign-in.
  const defaultPinHash = await hashPin(DEFAULT_PIN);
  let added = 0;
  for (const seed of MEMBERS) {
    const [created] = await db
      .insert(members)
      .values({
        nickname: seed.nickname,
        nicknameNormalized: normalizeNickname(seed.nickname),
        fullName: seed.nickname,
        role: seed.role,
        email: seed.role === "admin" ? seed.email.toLowerCase() : null,
        pool: seed.role === "staff" ? seed.pool : null,
        ...(seed.role === "staff" ? { pinHash: defaultPinHash, pinMustChange: true } : {}),
      })
      // Skips nicknames or emails that already exist.
      .onConflictDoNothing()
      .returning({ id: members.id });
    if (!created) continue;
    added++;
    await db.insert(auditLog).values({
      actorId: null,
      action: "member.bootstrap",
      subject: `member:${created.id}`,
      detail: { role: seed.role },
    });
  }

  await db.insert(settings).values({ key: MEMBERS_SEEDED, value: new Date().toISOString() }).onConflictDoNothing();
  console.info(`[seed] ${added} of ${MEMBERS.length} starting members added`);
}
