import { describe, expect, it } from "vitest";
import { distribution } from "./distribution";
import { generateLectureRoster, type GenArea, type GeneratorInput, type GenPattern, type GenSeat, type GenShift } from "./generate";
import { isG2Floor, validateRoster } from "./validate";

// A week shaped like the real lecture roster: 6 floor areas (2 in G2, 4 in G7)
// × Pagi/Siang with one seat each, a studio with two seats per shift, and PKL
// seats per building.
const area = (id: number, name: string, building: "G2" | "G7", kind: GenArea["kind"]): GenArea => ({ id, name, building, kind });
const STUDIO = area(1, "Studio G2", "G2", "studio");
const FLOORS = [
  area(2, "G2 Lantai 2 & 3", "G2", "floor"),
  area(3, "G2 Lantai 4", "G2", "floor"),
  area(4, "G7 Lantai 3", "G7", "floor"),
  area(5, "G7 Lantai 4", "G7", "floor"),
  area(6, "G7 Lantai 5", "G7", "floor"),
  area(7, "G7 Lantai 6", "G7", "floor"),
];
const BUILDING_G2 = area(8, "Gedung 2", "G2", "building");
const BUILDING_G7 = area(9, "Gedung 7", "G7", "building");
const PAGI: GenShift = { id: 1, label: "Pagi" };
const SIANG: GenShift = { id: 2, label: "Siang" };

const SEATS: GenSeat[] = [
  ...[PAGI, SIANG].map((shift) => ({ area: STUDIO, shift, capacity: 2 })),
  ...FLOORS.flatMap((floor) => [PAGI, SIANG].map((shift) => ({ area: floor, shift, capacity: 1 }))),
  ...[BUILDING_G2, BUILDING_G7].flatMap((building) => [PAGI, SIANG].map((shift) => ({ area: building, shift, capacity: 2 }))),
];

const DATES = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];
const LAB = Array.from({ length: 12 }, (_, i) => i + 1);

function input(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  const patterns: GenPattern[] = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    // Half the lab team on each shift, swapping every day.
    for (const id of LAB) patterns.push({ memberId: id, weekday, shiftId: (id + weekday) % 2 === 0 ? PAGI.id : SIANG.id, areaId: null });
    patterns.push({ memberId: 13, weekday, shiftId: PAGI.id, areaId: STUDIO.id });
    patterns.push({ memberId: 14, weekday, shiftId: PAGI.id, areaId: STUDIO.id });
    patterns.push({ memberId: 15, weekday, shiftId: SIANG.id, areaId: STUDIO.id });
    patterns.push({ memberId: 16, weekday, shiftId: SIANG.id, areaId: STUDIO.id });
    for (const id of [17, 18]) {
      patterns.push({
        memberId: id,
        weekday,
        shiftId: weekday % 2 === 1 ? PAGI.id : SIANG.id,
        areaId: weekday % 2 === 1 ? BUILDING_G2.id : BUILDING_G7.id,
      });
    }
  }
  return {
    dates: DATES,
    members: [
      ...LAB.map((id) => ({ id, nickname: `Lab${id}`, pool: "lab" as const, maxG2: id === 1 ? 0 : id === 2 ? 1 : 2 })),
      ...[13, 14, 15, 16].map((id) => ({ id, nickname: `Studio${id}`, pool: "studio" as const, maxG2: 2 })),
      ...[17, 18].map((id) => ({ id, nickname: `Pkl${id}`, pool: "pkl" as const, maxG2: 2 })),
    ],
    patterns,
    locks: [{ memberId: 3, weekday: 5 }],
    seats: SEATS,
    ...overrides,
  };
}

const areaOf = (id: number) => [STUDIO, ...FLOORS, BUILDING_G2, BUILDING_G7].find((a) => a.id === id)!;

describe("generateLectureRoster", () => {
  const result = generateLectureRoster(input(), { seed: 42 });
  const g2Of = (member: number) => result.assignments.filter((a) => a.memberId === member && isG2Floor(areaOf(a.areaId))).length;

  it("places everyone once per working day, without warnings", () => {
    expect(result.warnings).toEqual([]);
    for (const date of DATES) {
      const today = result.assignments.filter((a) => a.date === date);
      expect(today).toHaveLength(18);
      expect(new Set(today.map((a) => a.memberId)).size).toBe(18);
    }
  });

  it("keeps each lab member on the shift of their pattern", () => {
    for (const a of result.assignments.filter((a) => a.memberId <= 12)) {
      const weekday = DATES.indexOf(a.date) + 1;
      expect(a.shiftId).toBe((a.memberId + weekday) % 2 === 0 ? PAGI.id : SIANG.id);
      expect(areaOf(a.areaId).kind).toBe("floor");
    }
  });

  it("seats studio and PKL members where their pattern says", () => {
    for (const a of result.assignments.filter((a) => a.memberId >= 13 && a.memberId <= 16)) expect(a.areaId).toBe(STUDIO.id);
    const monday = result.assignments.filter((a) => a.date === DATES[0] && a.memberId >= 17);
    expect(monday.map((a) => [a.areaId, a.shiftId])).toEqual([
      [BUILDING_G2.id, PAGI.id],
      [BUILDING_G2.id, PAGI.id],
    ]);
  });

  it("fills every floor seat exactly once", () => {
    for (const date of DATES) {
      for (const floor of FLOORS) {
        for (const shift of [PAGI, SIANG]) {
          const seated = result.assignments.filter((a) => a.date === date && a.areaId === floor.id && a.shiftId === shift.id);
          expect(seated, `${date} ${floor.name} ${shift.label}`).toHaveLength(1);
        }
      }
    }
  });

  it("respects G2 caps and spreads G2 evenly", () => {
    expect(g2Of(1)).toBe(0);
    expect(g2Of(2)).toBeLessThanOrEqual(1);
    const others = LAB.filter((id) => id > 2).map(g2Of);
    expect(Math.max(...others)).toBeLessThanOrEqual(2);
    expect(Math.min(...others)).toBeGreaterThanOrEqual(1);
    expect(LAB.map(g2Of).reduce((a, b) => a + b, 0)).toBe(20);
  });

  it("puts a member locked to G2 in G2 that day", () => {
    const friday = result.assignments.find((a) => a.memberId === 3 && a.date === DATES[4])!;
    expect(isG2Floor(areaOf(friday.areaId))).toBe(true);
  });

  it("rotates floors so nobody sits on the same floor more than twice", () => {
    for (const id of LAB) {
      const floors = result.assignments.filter((a) => a.memberId === id).map((a) => a.areaId);
      const counts = [...new Set(floors)].map((floor) => floors.filter((f) => f === floor).length);
      expect(Math.max(...counts), `Lab${id}`).toBeLessThanOrEqual(2);
    }
  });

  it("is reproducible with the same seed", () => {
    expect(generateLectureRoster(input(), { seed: 42 }).assignments).toEqual(result.assignments);
  });

  it("warns when a shift has more people than seats", () => {
    const base = input();
    const crowded = generateLectureRoster(
      {
        ...base,
        members: [...base.members, { id: 99, nickname: "Ekstra", pool: "lab", maxG2: 2 }],
        patterns: [...base.patterns, { memberId: 99, weekday: 1, shiftId: (99 + 1) % 2 === 0 ? PAGI.id : SIANG.id, areaId: null }],
      },
      { seed: 1, attempts: 20 },
    );
    expect(crowded.warnings.some((w) => w.includes("tidak kebagian kursi"))).toBe(true);
  });
});

describe("validateRoster", () => {
  const members = new Map([
    [1, { nickname: "Ani", active: true, maxG2: 1 }],
    [2, { nickname: "Budi", active: false, maxG2: 2 }],
    [3, { nickname: "Citra", active: true, maxG2: 2 }],
  ]);
  const g2 = FLOORS[0];
  const g7 = FLOORS[2];

  it("flags inactive members, over-capacity seats, caps and locks", () => {
    const violations = validateRoster({
      mode: "lecture",
      dates: DATES,
      members,
      seats: SEATS,
      locks: [{ memberId: 3, weekday: 2 }],
      holidays: new Set(),
      assignments: [
        { date: DATES[0], areaId: g2.id, shiftId: PAGI.id, memberId: 1 },
        { date: DATES[1], areaId: g2.id, shiftId: PAGI.id, memberId: 1 },
        { date: DATES[0], areaId: g7.id, shiftId: PAGI.id, memberId: 2 },
        { date: DATES[0], areaId: g7.id, shiftId: PAGI.id, memberId: 3 },
        { date: DATES[1], areaId: g7.id, shiftId: SIANG.id, memberId: 3 },
      ],
    });
    const messages = violations.map((v) => `${v.severity}: ${v.message}`);
    expect(messages).toContain("error: Budi sudah nonaktif tapi masih dijadwalkan.");
    expect(messages).toContain("error: G7 Lantai 3 Pagi pada Senin diisi 2 orang (kapasitas 1).");
    expect(messages).toContain("warning: Ani: 2 shift G2 minggu ini (batas 1).");
    expect(messages).toContain("warning: Citra dikunci G2 pada Selasa, tapi ditempatkan di G7 Lantai 3.");
    expect(violations.filter((v) => v.severity === "info")).toHaveLength(5);
  });

  it("skips holidays and treats the generated week as clean", () => {
    const result = generateLectureRoster(input(), { seed: 7 });
    const violations = validateRoster({
      mode: "lecture",
      dates: DATES,
      members: new Map(input().members.map((m) => [m.id, { nickname: m.nickname, active: true, maxG2: m.maxG2 }])),
      seats: SEATS,
      locks: input().locks,
      holidays: new Set([DATES[2]]),
      assignments: result.assignments,
    });
    expect(violations).toEqual([]);
  });
});

describe("distribution", () => {
  it("counts duties by kind of area", () => {
    const rows = distribution(
      [
        { memberId: 1, nickname: "Ani", area: FLOORS[0] },
        { memberId: 1, nickname: "Ani", area: FLOORS[3] },
        { memberId: 1, nickname: "Ani", area: STUDIO },
        { memberId: 2, nickname: "Budi", area: BUILDING_G7 },
      ],
      new Map([[1, 2]]),
    );
    expect(rows).toEqual([
      { memberId: 1, nickname: "Ani", g2: 1, g7: 1, studio: 1, building: 0, total: 3, maxG2: 2 },
      { memberId: 2, nickname: "Budi", g2: 0, g7: 0, studio: 0, building: 1, total: 1, maxG2: null },
    ]);
  });
});
