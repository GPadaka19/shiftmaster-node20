import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Column names are derived from the keys (snake_case) via `casing` in the
// drizzle client and drizzle.config.ts.

export const memberRole = pgEnum("member_role", ["superadmin", "admin", "staff"]);
export const memberPool = pgEnum("member_pool", ["lab", "studio", "pkl"]);
export const mode = pgEnum("mode", ["lecture", "maintenance"]);
export const building = pgEnum("building", ["G2", "G7"]);
export const areaKind = pgEnum("area_kind", ["floor", "studio", "building"]);
export const roomKind = pgEnum("room_kind", ["lab", "studio", "virtual"]);
export const rosterStatus = pgEnum("roster_status", ["draft", "published"]);
export const rosterSource = pgEnum("roster_source", ["generated", "manual"]);
export const sheetSource = pgEnum("sheet_source", ["timetable", "agenda"]);
export const swapStatus = pgEnum("swap_status", [
  "awaiting_target",
  "awaiting_admin",
  "approved",
  "rejected",
  "declined",
  "cancelled",
  "expired",
]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Identity ────────────────────────────────────────────────────────────────

export const members = pgTable(
  "members",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    nickname: text().notNull(),
    nicknameNormalized: text().notNull().unique("members_nickname_normalized_unique"),
    fullName: text().notNull(),
    /** Lowercased. Required for admins, who sign in with Google. */
    email: text().unique("members_email_unique"),
    role: memberRole().notNull().default("staff"),
    /** Null means the member is never placed in a roster (admin only). */
    pool: memberPool(),
    /** Shown on the admin's "Hari Ini" card, e.g. "Admin Gedung 2". */
    dutyLabel: text(),
    /** First working day. Lab staff are G7-only for their first 4 roster weeks; null = not new. */
    startedOn: date(),
    /** Null uses the global default; 0 means G7 only. */
    maxG2PerWeek: smallint("max_g2_per_week"),
    pinHash: text(),
    /** Set when the PIN was given by an admin (or is the default); cleared when the member picks their own. */
    pinMustChange: boolean().notNull().default(false),
    failedPinAttempts: smallint().notNull().default(0),
    pinLockedUntil: timestamp({ withTimezone: true }),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [check("members_admin_has_email", sql`${t.role} = 'staff' OR ${t.email} IS NOT NULL`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the cookie token; the token itself is never stored. */
    tokenHash: text().primaryKey(),
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index().on(t.memberId), index().on(t.expiresAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    actorId: integer().references(() => members.id, { onDelete: "set null" }),
    /** e.g. "member.create", "member.pin.set", "roster.publish" */
    action: text().notNull(),
    /** e.g. "member:7", "roster_week:2026-10-05" */
    subject: text().notNull(),
    detail: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.createdAt)],
);

// ─── Places ──────────────────────────────────────────────────────────────────

export const areas = pgTable("areas", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text().notNull().unique(),
  name: text().notNull(),
  building: building().notNull(),
  kind: areaKind().notNull(),
  sortOrder: smallint().notNull().default(0),
});

export const rooms = pgTable("rooms", {
  /** As written in the sheet, e.g. "L 7.3.2", "S 2.2.8", "VL.01". */
  code: text().primaryKey(),
  building: building(),
  floor: smallint(),
  kind: roomKind().notNull(),
  areaId: integer().references(() => areas.id, { onDelete: "set null" }),
  visible: boolean().notNull().default(true),
});

// ─── Shifts and seats ────────────────────────────────────────────────────────

export const shifts = pgTable("shifts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text().notNull().unique(),
  mode: mode().notNull(),
  label: text().notNull(),
  startTime: time().notNull(),
  endTime: time().notNull(),
  sortOrder: smallint().notNull().default(0),
});

/** How many people an area needs per shift. The mode comes from the shift. */
export const seatTemplates = pgTable(
  "seat_templates",
  {
    areaId: integer()
      .notNull()
      .references(() => areas.id, { onDelete: "cascade" }),
    shiftId: integer()
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    capacity: smallint().notNull(),
  },
  (t) => [primaryKey({ columns: [t.areaId, t.shiftId] }), check("seat_templates_capacity", sql`${t.capacity} > 0`)],
);

// ─── Roster rules ────────────────────────────────────────────────────────────

/** Weekly pattern: which shift a member works on each weekday (1 = Senin). */
export const memberPatterns = pgTable(
  "member_patterns",
  {
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    shiftId: integer()
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    /** Fixed area for studio and PKL members; null lets the generator rotate. */
    areaId: integer().references(() => areas.id, { onDelete: "set null" }),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.weekday] }),
    check("member_patterns_weekday", sql`${t.weekday} BETWEEN 1 AND 5`),
  ],
);

/** The member must be placed in a G2 area on this weekday. */
export const memberG2Locks = pgTable(
  "member_g2_locks",
  {
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.weekday] }),
    check("member_g2_locks_weekday", sql`${t.weekday} BETWEEN 1 AND 5`),
  ],
);

export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Calendar ────────────────────────────────────────────────────────────────

export const periods = pgTable(
  "periods",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    mode: mode().notNull(),
    startDate: date().notNull(),
    endDate: date().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.startDate), check("periods_range", sql`${t.endDate} >= ${t.startDate}`)],
);

export const holidays = pgTable("holidays", {
  date: date().primaryKey(),
  name: text().notNull(),
  description: text(),
});

// ─── Roster ──────────────────────────────────────────────────────────────────

export const rosterWeeks = pgTable(
  "roster_weeks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    /** Always a Monday. */
    weekStart: date().notNull().unique("roster_weeks_week_start_unique"),
    mode: mode().notNull(),
    status: rosterStatus().notNull().default("draft"),
    source: rosterSource().notNull(),
    createdBy: integer().references(() => members.id, { onDelete: "set null" }),
    publishedAt: timestamp({ withTimezone: true }),
    publishedBy: integer().references(() => members.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [check("roster_weeks_monday", sql`EXTRACT(ISODOW FROM ${t.weekStart}) = 1`)],
);

/** One member in one seat on one day. An empty seat has no row. */
export const assignments = pgTable(
  "assignments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    rosterWeekId: integer()
      .notNull()
      .references(() => rosterWeeks.id, { onDelete: "cascade" }),
    date: date().notNull(),
    areaId: integer()
      .notNull()
      .references(() => areas.id),
    shiftId: integer()
      .notNull()
      .references(() => shifts.id),
    memberId: integer()
      .notNull()
      .references(() => members.id),
    position: smallint().notNull().default(1),
  },
  (t) => [unique("assignments_week_date_member_unique").on(t.rosterWeekId, t.date, t.memberId), index().on(t.date)],
);

// ─── Google Sheets ───────────────────────────────────────────────────────────

/** Last good copy of each sheet, served when Sheets is down or after a restart. */
export const sheetSnapshots = pgTable("sheet_snapshots", {
  source: sheetSource().primaryKey(),
  fetchedAt: timestamp({ withTimezone: true }).notNull(),
  payload: jsonb().notNull(),
  lastError: text(),
  lastErrorAt: timestamp({ withTimezone: true }),
});

// ─── Shift swaps ─────────────────────────────────────────────────────────────

/**
 * A request to trade seats on one day: the requester's assignment for the
 * target's. The target accepts first, then one admin approves. The seats at
 * request time are kept, so history survives roster edits; if an assignment
 * changes or disappears before approval, the request no longer applies.
 */
export const swapRequests = pgTable(
  "swap_requests",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    rosterWeekId: integer()
      .notNull()
      .references(() => rosterWeeks.id, { onDelete: "cascade" }),
    date: date().notNull(),
    requesterId: integer()
      .notNull()
      .references(() => members.id),
    requesterAssignmentId: integer().references(() => assignments.id, { onDelete: "set null" }),
    requesterAreaId: integer()
      .notNull()
      .references(() => areas.id),
    requesterShiftId: integer()
      .notNull()
      .references(() => shifts.id),
    targetId: integer()
      .notNull()
      .references(() => members.id),
    targetAssignmentId: integer().references(() => assignments.id, { onDelete: "set null" }),
    targetAreaId: integer()
      .notNull()
      .references(() => areas.id),
    targetShiftId: integer()
      .notNull()
      .references(() => shifts.id),
    reason: text(),
    status: swapStatus().notNull().default("awaiting_target"),
    targetRespondedAt: timestamp({ withTimezone: true }),
    /** Who closed it: the target (declined), an admin (approved/rejected), or null (system). */
    decidedBy: integer().references(() => members.id, { onDelete: "set null" }),
    decidedAt: timestamp({ withTimezone: true }),
    /** Admin's note on rejection, or why the system expired it. */
    note: text(),
    ...timestamps,
  },
  (t) => [index().on(t.status), index().on(t.requesterId), index().on(t.targetId), index().on(t.date)],
);
