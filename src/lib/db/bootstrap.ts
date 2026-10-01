import { eq } from "drizzle-orm";
import { normalizeNickname } from "@/lib/auth/pin";
import type { Db } from "./client";
import { AREAS, ROOMS, SEATS, SETTINGS, SHIFTS } from "./seed-data";
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
