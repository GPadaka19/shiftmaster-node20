import { eq } from "drizzle-orm";
import { addDaysIso } from "@/lib/time";
import { DEFAULT_PIN } from "@/lib/auth/constants";
import { hashPin, normalizeNickname } from "@/lib/auth/pin";
import type { Db } from "./client";
import { AREAS, FIRST_PATTERNS, FIRST_ROSTER, MEMBERS, ROOMS, SEATS, SETTINGS, SHIFTS } from "./seed-data";
import {
  areas,
  assignments,
  auditLog,
  memberPatterns,
  members,
  rooms,
  rosterWeeks,
  seatTemplates,
  settings,
  shifts,
} from "./schema";

// What every install needs before anyone can sign in. Runs at server start in
// production (src/instrumentation.ts) and from `pnpm db:seed`. Only adds rows
// that are missing, so it never undoes changes admins made in the app.

/** Areas, rooms, shifts, seats and settings from seed-data.ts. */
export async function seedConfiguration(db: Db) {
  await db.insert(areas).values(AREAS).onConflictDoNothing({ target: areas.code });
  const areaId = new Map((await db.select({ id: areas.id, code: areas.code }).from(areas)).map((a) => [a.code, a.id]));

  await db
    .insert(rooms)
    .values(
      ROOMS.map((room) => ({
        code: room.code,
        building: room.building,
        floor: room.floor,
        kind: room.kind,
        areaId: room.area ? areaId.get(room.area)! : null,
        visible: room.visible,
      })),
    )
    .onConflictDoNothing({ target: rooms.code });

  await db.insert(shifts).values(SHIFTS).onConflictDoNothing({ target: shifts.code });
  const shiftId = new Map((await db.select({ id: shifts.id, code: shifts.code }).from(shifts)).map((s) => [s.code, s.id]));

  await db
    .insert(seatTemplates)
    .values(SEATS.map((seat) => ({ areaId: areaId.get(seat.area)!, shiftId: shiftId.get(seat.shift)!, capacity: seat.capacity })))
    .onConflictDoNothing();

  await db
    .insert(settings)
    .values(Object.entries(SETTINGS).map(([key, value]) => ({ key, value })))
    .onConflictDoNothing();

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

const FIRST_ROSTER_SEEDED = "first_roster_seeded_at";

/**
 * The go-live week's roster from seed-data.ts, published. Runs once per
 * install and never touches a week that already exists.
 */
export async function seedFirstRoster(db: Db) {
  const [done] = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, FIRST_ROSTER_SEEDED));
  if (done) return;

  const [existing] = await db.select({ id: rosterWeeks.id }).from(rosterWeeks).where(eq(rosterWeeks.weekStart, FIRST_ROSTER.weekStart));
  if (!existing) {
    const memberId = new Map((await db.select({ id: members.id, nickname: members.nicknameNormalized }).from(members)).map((m) => [m.nickname, m.id]));
    const areaId = new Map((await db.select({ id: areas.id, code: areas.code }).from(areas)).map((a) => [a.code, a.id]));
    const shiftId = new Map((await db.select({ id: shifts.id, code: shifts.code }).from(shifts)).map((s) => [s.code, s.id]));
    const idOf = (map: Map<string, number>, key: string) => {
      const id = map.get(key);
      if (id === undefined) throw new Error(`[seed] first roster refers to unknown "${key}"`);
      return id;
    };

    await db.transaction(async (tx) => {
      const [week] = await tx
        .insert(rosterWeeks)
        .values({ weekStart: FIRST_ROSTER.weekStart, mode: "lecture", status: "published", source: "manual", publishedAt: new Date() })
        .returning({ id: rosterWeeks.id });
      await tx.insert(assignments).values(
        FIRST_ROSTER.rows.flatMap((row) =>
          row.days.map((nickname, day) => ({
            rosterWeekId: week.id,
            date: addDaysIso(FIRST_ROSTER.weekStart, day),
            areaId: idOf(areaId, row.area),
            shiftId: idOf(shiftId, row.shift),
            memberId: idOf(memberId, normalizeNickname(nickname)),
            position: row.position ?? 1,
          })),
        ),
      );
      await tx.insert(auditLog).values({ actorId: null, action: "roster.seed", subject: `roster_week:${FIRST_ROSTER.weekStart}` });
    });
    console.info(`[seed] first roster for week ${FIRST_ROSTER.weekStart} published`);
  }

  await db.insert(settings).values({ key: FIRST_ROSTER_SEEDED, value: new Date().toISOString() }).onConflictDoNothing();
}

const FIRST_PATTERNS_SEEDED = "first_patterns_seeded_at";

/**
 * The team's weekly patterns from seed-data.ts. Runs once per install, and
 * only while nobody has a pattern yet, so it never overwrites the rules page.
 */
export async function seedFirstPatterns(db: Db) {
  const [done] = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, FIRST_PATTERNS_SEEDED));
  if (done) return;

  const [anyPattern] = await db.select({ memberId: memberPatterns.memberId }).from(memberPatterns).limit(1);
  if (!anyPattern) {
    const memberId = new Map(
      (await db.select({ id: members.id, nickname: members.nicknameNormalized }).from(members)).map((m) => [m.nickname, m.id]),
    );
    const areaId = new Map((await db.select({ id: areas.id, code: areas.code }).from(areas)).map((a) => [a.code, a.id]));
    const shiftId = new Map((await db.select({ id: shifts.id, code: shifts.code }).from(shifts)).map((s) => [s.code, s.id]));

    // Members renamed or removed since go-live are skipped rather than failing the start.
    const rows = FIRST_PATTERNS.flatMap((pattern) => {
      const member = memberId.get(normalizeNickname(pattern.nickname));
      const shift = shiftId.get(pattern.shift);
      const area = pattern.area === null ? null : areaId.get(pattern.area);
      if (member === undefined || shift === undefined || area === undefined) return [];
      return [{ memberId: member, weekday: pattern.weekday, shiftId: shift, areaId: area }];
    });

    if (rows.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(memberPatterns).values(rows).onConflictDoNothing();
        await tx.insert(auditLog).values({ actorId: null, action: "rules.seed", subject: "member_patterns", detail: { rows: rows.length } });
      });
    }
    console.info(`[seed] ${rows.length} weekly pattern rows from the go-live week`);
  }

  await db.insert(settings).values({ key: FIRST_PATTERNS_SEEDED, value: new Date().toISOString() }).onConflictDoNothing();
}
