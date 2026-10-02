import type { Mode } from "@/lib/period/resolve";
import { formatShortDate, WEEKDAY_NAMES } from "@/lib/time";
import type { GenArea, GenLock, GenSeat } from "./generate";

// Checks a roster against the rules. Manual edits bypass the generator, so the
// editor shows these as a banner rather than blocking the change.

export type Violation = {
  severity: "error" | "warning" | "info";
  message: string;
};

export type CheckedAssignment = { date: string; areaId: number; shiftId: number; memberId: number };
export type CheckedMember = {
  nickname: string;
  active: boolean;
  maxG2: number | null;
  /** The cap the generator may stretch to when G2 seats would go unfilled; defaults to maxG2. */
  stretchMaxG2?: number | null;
  /** Set while a new lab member may only work in G7 (see newcomer.ts). */
  g7OnlyUntil?: string | null;
};

export type ValidationInput = {
  mode: Mode;
  /** Monday first; weekday = index + 1. */
  dates: readonly string[];
  assignments: readonly CheckedAssignment[];
  members: ReadonlyMap<number, CheckedMember>;
  /** Seats of the roster's mode. */
  seats: readonly GenSeat[];
  locks: readonly GenLock[];
  holidays: ReadonlySet<string>;
};

/** Floor areas count toward the G2 quota; the studio and PKL building seats do not. */
export function isG2Floor(area: Pick<GenArea, "building" | "kind">): boolean {
  return area.kind === "floor" && area.building === "G2";
}

export function validateRoster(input: ValidationInput): Violation[] {
  const violations: Violation[] = [];
  const seatByKey = new Map(input.seats.map((s) => [`${s.area.id}:${s.shift.id}`, s]));
  const areaById = new Map(input.seats.map((s) => [s.area.id, s.area]));
  const name = (id: number) => input.members.get(id)?.nickname ?? `#${id}`;
  const dayName = (date: string) => WEEKDAY_NAMES[input.dates.indexOf(date) + 1] ?? date;

  // Inactive members still on the roster.
  const inactive = new Set(input.assignments.filter((a) => input.members.get(a.memberId)?.active === false).map((a) => a.memberId));
  for (const id of inactive) {
    violations.push({ severity: "error", message: `${name(id)} sudah nonaktif tapi masih dijadwalkan.` });
  }

  // Seats that do not exist in this mode, or are over capacity.
  const filled = new Map<string, number>();
  for (const a of input.assignments) {
    const key = `${a.areaId}:${a.shiftId}`;
    if (!seatByKey.has(key)) {
      violations.push({ severity: "error", message: `${name(a.memberId)} ditempatkan di kursi yang tidak ada pada mode ini (${dayName(a.date)}).` });
      continue;
    }
    filled.set(`${a.date}|${key}`, (filled.get(`${a.date}|${key}`) ?? 0) + 1);
  }
  for (const [key, count] of filled) {
    const [date, seatKey] = key.split("|");
    const seat = seatByKey.get(seatKey)!;
    if (count > seat.capacity) {
      violations.push({
        severity: "error",
        message: `${seat.area.name} ${seat.shift.label} pada ${dayName(date)} diisi ${count} orang (kapasitas ${seat.capacity}).`,
      });
    }
  }

  if (input.mode === "lecture") {
    // G2 quota.
    const g2 = new Map<number, number>();
    for (const a of input.assignments) {
      const area = areaById.get(a.areaId);
      if (area && isG2Floor(area)) g2.set(a.memberId, (g2.get(a.memberId) ?? 0) + 1);
    }
    for (const [id, count] of g2) {
      const until = input.members.get(id)?.g7OnlyUntil;
      if (until) {
        violations.push({
          severity: "warning",
          message: `${name(id)} masih staf baru (G7 saja sampai ${formatShortDate(until)}), tapi dapat ${count} shift G2.`,
        });
        continue;
      }
      const member = input.members.get(id);
      const cap = member?.maxG2;
      if (cap === null || cap === undefined || count <= cap) continue;
      const stretch = member?.stretchMaxG2 ?? cap;
      if (count <= stretch) {
        violations.push({
          severity: "info",
          message: `${name(id)}: ${count} shift G2 minggu ini, di atas batas ${cap} (boleh sampai ${stretch} kalau kursi G2 kurang orang).`,
        });
      } else {
        violations.push({ severity: "warning", message: `${name(id)}: ${count} shift G2 minggu ini (batas ${stretch}).` });
      }
    }

    // G2 locks, for days the member works.
    for (const lock of input.locks) {
      if (input.members.get(lock.memberId)?.g7OnlyUntil) continue;
      const date = input.dates[lock.weekday - 1];
      if (!date || input.holidays.has(date)) continue;
      const duty = input.assignments.find((a) => a.memberId === lock.memberId && a.date === date);
      if (!duty) continue;
      const area = areaById.get(duty.areaId);
      if (area && !isG2Floor(area)) {
        violations.push({
          severity: "warning",
          message: `${name(lock.memberId)} dikunci G2 pada ${dayName(date)}, tapi ditempatkan di ${area.name}.`,
        });
      }
    }
  }

  // Empty seats, per working day. PKL seats in lecture weeks are optional.
  for (const date of input.dates) {
    if (input.holidays.has(date)) continue;
    const empty = input.seats
      .filter((seat) => !(input.mode === "lecture" && seat.area.kind === "building"))
      .filter((seat) => (filled.get(`${date}|${seat.area.id}:${seat.shift.id}`) ?? 0) < seat.capacity)
      .map((seat) => `${seat.area.name} ${seat.shift.label}`);
    if (empty.length > 0) {
      violations.push({ severity: "info", message: `${dayName(date)}: kursi kosong di ${empty.join(", ")}.` });
    }
  }

  return violations;
}
