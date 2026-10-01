import type { Pool } from "@/lib/members/labels";
import { WEEKDAY_NAMES } from "@/lib/time";
import { seededRandom, shuffled } from "./random";

// Builds a lecture-mode roster for one week from the rules admins keep in the
// app. It replaces the old rosterGenerator.ts, with the same rules:
//
//   - Everyone works the shift their weekly pattern says (morning or afternoon).
//   - Studio and PKL members, and anyone whose pattern names an area, sit there.
//   - Lab members rotate over the floor areas of their shift:
//       * G2 seats are shared out evenly, never above a member's G2 cap
//         (cap 0 means G7 only);
//       * a member locked to G2 on a weekday sits in G2 that day;
//       * nobody repeats a floor in the week if it can be avoided.
//
// Each attempt is greedy with random tie-breaks; the best of many attempts
// wins. Pass a fixed seed to get the same roster back.

export type GenArea = { id: number; name: string; building: "G2" | "G7"; kind: "floor" | "studio" | "building" };
export type GenShift = { id: number; label: string };
export type GenSeat = { area: GenArea; shift: GenShift; capacity: number };
export type GenMember = { id: number; nickname: string; pool: Pool; maxG2: number };
/** weekday: 1 = Monday … 5 = Friday. areaId null means "rotate me". */
export type GenPattern = { memberId: number; weekday: number; shiftId: number; areaId: number | null };
export type GenLock = { memberId: number; weekday: number };

export type GeneratorInput = {
  /** The five dates of the week, Monday first. */
  dates: readonly string[];
  members: readonly GenMember[];
  patterns: readonly GenPattern[];
  locks: readonly GenLock[];
  /** Lecture seats only. */
  seats: readonly GenSeat[];
};

export type GeneratedAssignment = { date: string; areaId: number; shiftId: number; memberId: number; position: number };

export type GeneratorResult = {
  assignments: GeneratedAssignment[];
  /** Things an admin should look at, in Indonesian. */
  warnings: string[];
  /** Lower is better; 0 is a perfect week. */
  score: number;
};

type Slot = { area: GenArea; position: number };

const WEIGHT = { warning: 1000, floorRepeat: 10, imbalance: 5 } as const;

/** Cheapest way to give each person one slot, preferring floors they have not had this week. */
function assignToSlots(
  people: readonly number[],
  slots: readonly Slot[],
  floorCount: Map<number, Map<number, number>>,
  random: () => number,
): Map<number, Slot> {
  const cost = (person: number, slot: Slot) => floorCount.get(person)?.get(slot.area.id) ?? 0;
  const order = shuffled(slots, random);
  let best: Map<number, Slot> = new Map();
  let bestCost = Infinity;

  // People and slots per shift are few (≤ 6 floors), so an exhaustive search is cheap.
  const search = (index: number, used: Set<Slot>, chosen: Map<number, Slot>, total: number) => {
    if (total >= bestCost) return;
    if (index === people.length) {
      best = new Map(chosen);
      bestCost = total;
      return;
    }
    for (const slot of order) {
      if (used.has(slot)) continue;
      used.add(slot);
      chosen.set(people[index], slot);
      search(index + 1, used, chosen, total + cost(people[index], slot));
      chosen.delete(people[index]);
      used.delete(slot);
    }
  };
  search(0, new Set(), new Map(), 0);
  return best;
}

function runAttempt(input: GeneratorInput, random: () => number): GeneratorResult {
  const warnings = new Set<string>();
  const assignments: GeneratedAssignment[] = [];
  const members = new Map(input.members.map((m) => [m.id, m]));
  const areaById = new Map(input.seats.map((s) => [s.area.id, s.area]));
  const shiftById = new Map(input.seats.map((s) => [s.shift.id, s.shift]));
  const capacity = new Map(input.seats.map((s) => [`${s.area.id}:${s.shift.id}`, s.capacity]));
  const locked = new Set(input.locks.map((l) => `${l.memberId}:${l.weekday}`));

  // Floor slots per shift, split by building.
  const floorSlots = new Map<number, { g2: Slot[]; g7: Slot[] }>();
  for (const seat of input.seats) {
    if (seat.area.kind !== "floor") continue;
    const slots = floorSlots.get(seat.shift.id) ?? { g2: [], g7: [] };
    for (let position = 1; position <= seat.capacity; position++) {
      (seat.area.building === "G2" ? slots.g2 : slots.g7).push({ area: seat.area, position });
    }
    floorSlots.set(seat.shift.id, slots);
  }

  // Rotating lab patterns, and each member's fair share of G2 for the week.
  const rotating = input.patterns.filter((p) => p.areaId === null && members.get(p.memberId)?.pool === "lab");
  const workdays = new Map<number, number>();
  for (const p of rotating) workdays.set(p.memberId, (workdays.get(p.memberId) ?? 0) + 1);
  // G2 seats that can actually be filled: per day and shift, no more than the people working it.
  let totalG2 = 0;
  for (let weekday = 1; weekday <= input.dates.length; weekday++) {
    for (const [shiftId, slots] of floorSlots) {
      const working = rotating.filter((p) => p.weekday === weekday && p.shiftId === shiftId).length;
      totalG2 += Math.min(slots.g2.length, working);
    }
  }
  const eligibleDays = [...workdays].filter(([id]) => (members.get(id)?.maxG2 ?? 0) > 0).reduce((sum, [, days]) => sum + days, 0);
  const fairShare = new Map<number, number>();
  for (const [id, days] of workdays) {
    const cap = members.get(id)?.maxG2 ?? 0;
    fairShare.set(id, cap > 0 && eligibleDays > 0 ? Math.min(cap, (totalG2 * days) / eligibleDays) : 0);
  }

  const g2Count = new Map<number, number>();
  const daysSoFar = new Map<number, number>();
  const floorCount = new Map<number, Map<number, number>>();
  const nextPosition = new Map<string, number>();

  const place = (date: string, areaId: number, shiftId: number, memberId: number, position?: number) => {
    const key = `${date}:${areaId}:${shiftId}`;
    const pos = position ?? (nextPosition.get(key) ?? 0) + 1;
    nextPosition.set(key, Math.max(pos, nextPosition.get(key) ?? 0));
    assignments.push({ date, areaId, shiftId, memberId, position: pos });
  };

  input.dates.forEach((date, index) => {
    const weekday = index + 1;
    const today = input.patterns.filter((p) => p.weekday === weekday && members.has(p.memberId));

    // Fixed seats: studio, PKL, and anyone whose pattern names an area.
    for (const p of today) {
      if (p.areaId === null) {
        if (members.get(p.memberId)!.pool !== "lab") {
          warnings.add(`${members.get(p.memberId)!.nickname} (${members.get(p.memberId)!.pool}) tidak punya area di polanya.`);
        }
        continue;
      }
      const area = areaById.get(p.areaId);
      if (!area || !capacity.has(`${p.areaId}:${p.shiftId}`)) {
        warnings.add(`Pola ${members.get(p.memberId)!.nickname} menunjuk area/shift yang tidak punya kursi.`);
        continue;
      }
      place(date, p.areaId, p.shiftId, p.memberId);
    }

    // Rotating lab members, one shift at a time.
    const byShift = new Map<number, number[]>();
    for (const p of today) {
      if (p.areaId !== null || members.get(p.memberId)!.pool !== "lab") continue;
      byShift.set(p.shiftId, [...(byShift.get(p.shiftId) ?? []), p.memberId]);
    }

    for (const [shiftId, people] of byShift) {
      const slots = floorSlots.get(shiftId);
      const shiftLabel = shiftById.get(shiftId)?.label ?? `shift ${shiftId}`;
      if (!slots) {
        warnings.add(`Tidak ada kursi lantai untuk shift ${shiftLabel}.`);
        continue;
      }

      // Who is furthest behind their fair share of G2 goes first.
      const behind = (id: number) => {
        const share = fairShare.get(id) ?? 0;
        const expected = (share * ((daysSoFar.get(id) ?? 0) + 1)) / (workdays.get(id) ?? 1);
        return (g2Count.get(id) ?? 0) - expected;
      };
      const isLocked = (id: number) => locked.has(`${id}:${weekday}`);
      const underCap = (id: number) => (g2Count.get(id) ?? 0) < (members.get(id)?.maxG2 ?? 0);

      const lockedToday = shuffled(people.filter(isLocked), random);
      const candidates = shuffled(people.filter((id) => !isLocked(id) && underCap(id)), random).sort((a, b) => behind(a) - behind(b));
      for (const id of lockedToday) {
        if (!underCap(id)) warnings.add(`${members.get(id)!.nickname} dikunci G2 tapi kuota G2-nya sudah habis.`);
      }
      if (lockedToday.length > slots.g2.length) {
        warnings.add(`Terlalu banyak yang dikunci G2 untuk ${shiftLabel} pada ${WEEKDAY_NAMES[weekday]}.`);
      }

      const toG2 = [...lockedToday, ...candidates].slice(0, slots.g2.length);
      const toG7 = people.filter((id) => !toG2.includes(id));
      const seatedG7 = toG7.slice(0, slots.g7.length);
      for (const id of toG7.slice(slots.g7.length)) {
        warnings.add(`${members.get(id)!.nickname} tidak kebagian kursi ${shiftLabel} pada ${WEEKDAY_NAMES[weekday]}.`);
      }

      for (const [group, groupSlots] of [
        [toG2, slots.g2],
        [seatedG7, slots.g7],
      ] as const) {
        const seated = assignToSlots(group, groupSlots, floorCount, random);
        for (const [id, slot] of seated) {
          place(date, slot.area.id, shiftId, id, slot.position);
          const floors = floorCount.get(id) ?? new Map<number, number>();
          floors.set(slot.area.id, (floors.get(slot.area.id) ?? 0) + 1);
          floorCount.set(id, floors);
          if (slot.area.building === "G2") g2Count.set(id, (g2Count.get(id) ?? 0) + 1);
        }
      }
      for (const id of people) daysSoFar.set(id, (daysSoFar.get(id) ?? 0) + 1);
    }

    // Seats filled beyond capacity (fixed seats can collide).
    const filled = new Map<string, number>();
    for (const a of assignments) {
      if (a.date !== date) continue;
      const key = `${a.areaId}:${a.shiftId}`;
      filled.set(key, (filled.get(key) ?? 0) + 1);
    }
    for (const [key, count] of filled) {
      if (count > (capacity.get(key) ?? 0)) {
        const [areaId, shiftId] = key.split(":").map(Number);
        warnings.add(`${areaById.get(areaId)?.name} ${shiftById.get(shiftId)?.label} melebihi kapasitas pada ${WEEKDAY_NAMES[weekday]}.`);
      }
    }
  });

  let floorPenalty = 0;
  for (const floors of floorCount.values()) {
    for (const count of floors.values()) if (count > 1) floorPenalty += (count - 1) ** 2;
  }
  let imbalance = 0;
  for (const [id, share] of fairShare) imbalance += ((g2Count.get(id) ?? 0) - share) ** 2;

  return {
    assignments,
    warnings: [...warnings],
    score: warnings.size * WEIGHT.warning + floorPenalty * WEIGHT.floorRepeat + imbalance * WEIGHT.imbalance,
  };
}

export function generateLectureRoster(
  input: GeneratorInput,
  { seed = Date.now(), attempts = 200 }: { seed?: number; attempts?: number } = {},
): GeneratorResult {
  const random = seededRandom(seed);
  let best: GeneratorResult | null = null;
  for (let i = 0; i < attempts; i++) {
    const attempt = runAttempt(input, random);
    if (!best || attempt.score < best.score) best = attempt;
  }
  return best!;
}
