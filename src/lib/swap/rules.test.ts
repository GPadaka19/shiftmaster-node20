import { describe, expect, it } from "vitest";
import { isPastDeadline, seatsChanged, swapBlockReason, swapDeadline, type SwapSide } from "./rules";

const PAGI = 1;
const SIANG = 2;

const side = (overrides: Partial<SwapSide> = {}): SwapSide => ({
  assignmentId: 1,
  memberId: 1,
  pool: "lab",
  date: "2026-10-06",
  rosterWeekId: 10,
  weekMode: "lecture",
  weekPublished: true,
  areaId: 4,
  shiftId: PAGI,
  ...overrides,
});

// Thursday 1 Oct 2026, 10:00 WIB.
const NOW = new Date("2026-10-01T03:00:00Z");

describe("swapDeadline", () => {
  it("is the start of the shift's day in WIB (H-1 23:59)", () => {
    expect(swapDeadline("2026-10-06").toISOString()).toBe("2026-10-05T17:00:00.000Z");
  });

  it("closes once the day has started", () => {
    expect(isPastDeadline("2026-10-02", new Date("2026-10-01T16:59:59Z"))).toBe(false);
    expect(isPastDeadline("2026-10-02", new Date("2026-10-01T17:00:00Z"))).toBe(true);
    expect(isPastDeadline("2026-10-01", NOW)).toBe(true);
  });
});

describe("swapBlockReason", () => {
  const mine = side();
  const theirs = side({ assignmentId: 2, memberId: 2, shiftId: SIANG, areaId: 2 });

  it("allows a same-day Pagi ↔ Siang trade inside one pool", () => {
    expect(swapBlockReason(mine, theirs, NOW)).toBeNull();
    const studioA = side({ pool: "studio" });
    const studioB = side({ assignmentId: 2, memberId: 2, pool: "studio", shiftId: SIANG });
    expect(swapBlockReason(studioA, studioB, NOW)).toBeNull();
  });

  it("refuses everything else, with a reason", () => {
    expect(swapBlockReason(mine, { ...theirs, memberId: 1 }, NOW)).toMatch(/dirimu sendiri/);
    expect(swapBlockReason(mine, { ...theirs, date: "2026-10-07" }, NOW)).toMatch(/hari yang sama/);
    expect(swapBlockReason(mine, { ...theirs, rosterWeekId: 11 }, NOW)).toMatch(/hari yang sama/);
    expect(swapBlockReason({ ...mine, weekPublished: false }, theirs, NOW)).toMatch(/belum terbit/);
    expect(swapBlockReason({ ...mine, weekMode: "maintenance" }, { ...theirs, weekMode: "maintenance" }, NOW)).toMatch(/masa kuliah/);
    expect(swapBlockReason(mine, { ...theirs, pool: "studio" }, NOW)).toMatch(/sesama pool/);
    expect(swapBlockReason({ ...mine, pool: "pkl" }, { ...theirs, pool: "pkl" }, NOW)).toMatch(/PKL/);
    expect(swapBlockReason(mine, { ...theirs, shiftId: PAGI }, NOW)).toMatch(/Pagi ↔ Siang/);
    expect(swapBlockReason(mine, theirs, new Date("2026-10-05T17:00:00Z"))).toMatch(/batas waktu/);
  });
});

describe("seatsChanged", () => {
  const snapshot = { memberId: 1, areaId: 4, shiftId: PAGI };

  it("is false while both seats are as requested", () => {
    expect(seatsChanged({ snapshot, current: { ...snapshot } }, { snapshot, current: { ...snapshot } })).toBe(false);
  });

  it("is true when a seat was deleted, moved or given to someone else", () => {
    expect(seatsChanged({ snapshot, current: null })).toBe(true);
    expect(seatsChanged({ snapshot, current: { ...snapshot, areaId: 5 } })).toBe(true);
    expect(seatsChanged({ snapshot, current: { ...snapshot, shiftId: SIANG } })).toBe(true);
    expect(seatsChanged({ snapshot, current: { ...snapshot, memberId: 9 } })).toBe(true);
  });
});
