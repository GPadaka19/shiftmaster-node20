import { describe, expect, it } from "vitest";
import { distribution } from "./distribution";
import {
  g2Debt,
  generateLectureRoster,
  type GenArea,
  type GeneratorInput,
  type GenHistory,
  type GenPattern,
  type GenSeat,
  type GenShift,
} from "./generate";
import { isG2Floor, validateRoster } from "./validate";

// A week shaped like the real lecture roster: 6 floor areas (2 in G2, 4 in G7)
// × morning/afternoon with one seat each, a studio with two seats per shift, and PKL
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
const MORNING: GenShift = { id: 1, label: "Pagi" };
const AFTERNOON: GenShift = { id: 2, label: "Siang" };

const SEATS: GenSeat[] = [
  ...[MORNING, AFTERNOON].map((shift) => ({ area: STUDIO, shift, capacity: 2 })),
  ...FLOORS.flatMap((floor) => [MORNING, AFTERNOON].map((shift) => ({ area: floor, shift, capacity: 1 }))),
  ...[BUILDING_G2, BUILDING_G7].flatMap((building) => [MORNING, AFTERNOON].map((shift) => ({ area: building, shift, capacity: 2 }))),
];

const DATES = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];
const LAB = Array.from({ length: 12 }, (_, i) => i + 1);

function input(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  const patterns: GenPattern[] = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    // Half the lab team on each shift, swapping every day.
    for (const id of LAB) patterns.push({ memberId: id, weekday, shiftId: (id + weekday) % 2 === 0 ? MORNING.id : AFTERNOON.id, areaId: null });
    patterns.push({ memberId: 13, weekday, shiftId: MORNING.id, areaId: STUDIO.id });
    patterns.push({ memberId: 14, weekday, shiftId: MORNING.id, areaId: STUDIO.id });
    patterns.push({ memberId: 15, weekday, shiftId: AFTERNOON.id, areaId: STUDIO.id });
    patterns.push({ memberId: 16, weekday, shiftId: AFTERNOON.id, areaId: STUDIO.id });
    for (const id of [17, 18]) {
      patterns.push({
        memberId: id,
        weekday,
        shiftId: weekday % 2 === 1 ? MORNING.id : AFTERNOON.id,
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
      expect(a.shiftId).toBe((a.memberId + weekday) % 2 === 0 ? MORNING.id : AFTERNOON.id);
      expect(areaOf(a.areaId).kind).toBe("floor");
    }
  });

  it("seats studio and PKL members where their pattern says", () => {
    for (const a of result.assignments.filter((a) => a.memberId >= 13 && a.memberId <= 16)) expect(a.areaId).toBe(STUDIO.id);
    const monday = result.assignments.filter((a) => a.date === DATES[0] && a.memberId >= 17);
    expect(monday.map((a) => [a.areaId, a.shiftId])).toEqual([
      [BUILDING_G2.id, MORNING.id],
      [BUILDING_G2.id, MORNING.id],
    ]);
  });

  it("fills every floor seat exactly once", () => {
    for (const date of DATES) {
      for (const floor of FLOORS) {
        for (const shift of [MORNING, AFTERNOON]) {
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
        patterns: [...base.patterns, { memberId: 99, weekday: 1, shiftId: (99 + 1) % 2 === 0 ? MORNING.id : AFTERNOON.id, areaId: null }],
      },
      { seed: 1, attempts: 20 },
    );
    expect(crowded.warnings.some((w) => w.includes("tidak kebagian kursi"))).toBe(true);
  });
});

describe("generateLectureRoster when some lab staff are G7 only", () => {
  // Three lab members capped at 0 leave 9 people for 20 G2 seats: at the default
  // cap of 2 that is only 18, so two seats would be left and two people unseated.
  const ZERO = [1, 2, 3];
  const base = input({ locks: [] });
  const members = base.members.map((m) =>
    m.pool !== "lab" ? m : ZERO.includes(m.id) ? { ...m, maxG2: 0, stretchMaxG2: 0 } : { ...m, maxG2: 2, stretchMaxG2: 3 },
  );
  const result = generateLectureRoster({ ...base, members }, { seed: 3 });
  const g2Of = (member: number) => result.assignments.filter((a) => a.memberId === member && isG2Floor(areaOf(a.areaId))).length;

  it("seats everyone by stretching the default cap to 3", () => {
    expect(result.warnings.filter((w) => !w.includes("dinaikkan"))).toEqual([]);
    for (const date of DATES) expect(result.assignments.filter((a) => a.date === date)).toHaveLength(18);
    for (const id of ZERO) expect(g2Of(id)).toBe(0);
    const others = LAB.filter((id) => !ZERO.includes(id)).map(g2Of);
    expect(Math.max(...others)).toBe(3);
    expect(others.reduce((a, b) => a + b, 0)).toBe(20);
  });

  it("stretches as few members as possible and says who", () => {
    const stretched = LAB.filter((id) => g2Of(id) === 3);
    expect(stretched).toHaveLength(2);
    expect(result.warnings).toHaveLength(2);
    for (const id of stretched) {
      expect(result.warnings).toContain(`Lab${id} dapat 3 shift G2 (batas 2 dinaikkan karena kursi G2 kurang orang).`);
    }
  });

  it("never stretches a cap set on the member", () => {
    const fixed = members.map((m) => (m.pool === "lab" && !ZERO.includes(m.id) ? { ...m, stretchMaxG2: 2 } : m));
    const capped = generateLectureRoster({ ...base, members: fixed }, { seed: 3, attempts: 20 });
    expect(capped.warnings.some((w) => w.includes("tidak kebagian kursi"))).toBe(true);
  });
});

describe("g2Debt", () => {
  it("measures each member against everyone's G2 rate, per floor day", () => {
    const history: GenHistory[] = [
      { memberId: 1, floorDays: 10, g2Days: 6 },
      { memberId: 2, floorDays: 10, g2Days: 2 },
      { memberId: 3, floorDays: 5, g2Days: 2 },
    ];
    // 10 G2 out of 25 floor days: a rate of 0.4.
    const debt = g2Debt(history, new Set([1, 2, 3]));
    expect(debt.get(1)).toBeCloseTo(2);
    expect(debt.get(2)).toBeCloseTo(-2);
    expect(debt.get(3)).toBeCloseTo(0);
  });

  it("leaves out members who cannot take G2 this week, and copes with no history", () => {
    const debt = g2Debt([{ memberId: 1, floorDays: 10, g2Days: 0 }, { memberId: 2, floorDays: 10, g2Days: 4 }], new Set([2]));
    expect([...debt.keys()]).toEqual([2]);
    expect(debt.get(2)).toBeCloseTo(0);
    expect(g2Debt([], new Set([1])).size).toBe(0);
  });
});

describe("generateLectureRoster across weeks", () => {
  // Every lab member on a cap of 2, so G2 has room to move between them.
  const plain = input({ locks: [] });
  const base = { ...plain, members: plain.members.map((m) => (m.pool === "lab" ? { ...m, maxG2: 2 } : m)) };
  const g2Count = (assignments: { memberId: number; areaId: number }[], member: number) =>
    assignments.filter((a) => a.memberId === member && isG2Floor(areaOf(a.areaId))).length;

  it("gives less G2 to whoever had more than their share recently", () => {
    // Lab3 had G2 on every floor day of the last four weeks; Lab4 had none.
    const history: GenHistory[] = LAB.map((id) => ({
      memberId: id,
      floorDays: 20,
      g2Days: id === 3 ? 20 : id === 4 ? 0 : 7,
    }));
    const result = generateLectureRoster({ ...base, history }, { seed: 5 });
    expect(g2Count(result.assignments, 3)).toBe(0);
    expect(g2Count(result.assignments, 4)).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it("evens out G2 over many weeks", () => {
    const eligible = LAB;
    const totals = (useHistory: boolean) => {
      const weeks: GenHistory[][] = [];
      const total = new Map<number, number>();
      for (let week = 0; week < 8; week++) {
        const history = LAB.map((memberId) => {
          const recent = weeks.slice(-4).flat().filter((h) => h.memberId === memberId);
          return {
            memberId,
            floorDays: recent.reduce((sum, h) => sum + h.floorDays, 0),
            g2Days: recent.reduce((sum, h) => sum + h.g2Days, 0),
          };
        });
        const result = generateLectureRoster({ ...base, history: useHistory ? history : [] }, { seed: 100 + week, attempts: 60 });
        weeks.push(
          LAB.map((memberId) => ({
            memberId,
            floorDays: result.assignments.filter((a) => a.memberId === memberId).length,
            g2Days: g2Count(result.assignments, memberId),
          })),
        );
        for (const id of eligible) total.set(id, (total.get(id) ?? 0) + g2Count(result.assignments, id));
      }
      const values = eligible.map((id) => total.get(id)!);
      return Math.max(...values) - Math.min(...values);
    };
    expect(totals(true)).toBeLessThanOrEqual(2);
    expect(totals(true)).toBeLessThan(totals(false));
  });
});

describe("validateRoster", () => {
  const members = new Map([
    [1, { nickname: "Ani", active: true, maxG2: 1 }],
    [2, { nickname: "Budi", active: false, maxG2: 2 }],
    [3, { nickname: "Citra", active: true, maxG2: 2 }],
    [4, { nickname: "Dodi", active: true, maxG2: 0, stretchMaxG2: 1 }],
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
        { date: DATES[0], areaId: g2.id, shiftId: MORNING.id, memberId: 1 },
        { date: DATES[1], areaId: g2.id, shiftId: MORNING.id, memberId: 1 },
        { date: DATES[0], areaId: g7.id, shiftId: MORNING.id, memberId: 2 },
        { date: DATES[0], areaId: g7.id, shiftId: MORNING.id, memberId: 3 },
        { date: DATES[1], areaId: g7.id, shiftId: AFTERNOON.id, memberId: 3 },
        { date: DATES[2], areaId: g2.id, shiftId: AFTERNOON.id, memberId: 4 },
      ],
    });
    const messages = violations.map((v) => `${v.severity}: ${v.message}`);
    expect(messages).toContain("error: Budi sudah nonaktif tapi masih dijadwalkan.");
    expect(messages).toContain("error: G7 Lantai 3 Pagi pada Senin diisi 2 orang (kapasitas 1).");
    expect(messages).toContain("warning: Ani: 2 shift G2 minggu ini (batas 1).");
    expect(messages).toContain("warning: Citra dikunci G2 pada Selasa, tapi ditempatkan di G7 Lantai 3.");
    expect(messages).toContain(
      "info: Dodi: 1 shift G2 minggu ini, di atas batas 0 (boleh sampai 1 kalau kursi G2 kurang orang).",
    );
    expect(violations.filter((v) => v.severity === "info")).toHaveLength(6);
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
      new Map([[1, { maxG2: 2, stretchMaxG2: 3 }]]),
    );
    expect(rows).toEqual([
      { memberId: 1, nickname: "Ani", g2: 1, g7: 1, studio: 1, building: 0, total: 3, maxG2: 2, stretchMaxG2: 3 },
      { memberId: 2, nickname: "Budi", g2: 0, g7: 0, studio: 0, building: 1, total: 1, maxG2: null, stretchMaxG2: null },
    ]);
  });
});
