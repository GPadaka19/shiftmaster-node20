import { describe, expect, it } from "vitest";
import { weekStartIso } from "@/lib/time";
import { AREAS, ROOMS, SEATS, SHIFTS } from "./seed-data";

const areaCodes = new Set(AREAS.map((a) => a.code));
const shiftMode = new Map(SHIFTS.map((s) => [s.code, s.mode]));
const kindOf = new Map(AREAS.map((a) => [a.code, a.kind]));

describe("seed data", () => {
  it("has unique codes", () => {
    expect(areaCodes.size).toBe(AREAS.length);
    expect(new Set(ROOMS.map((r) => r.code)).size).toBe(ROOMS.length);
  });

  it("maps every visible room to a floor or studio area, and hides the rest", () => {
    for (const room of ROOMS) {
      if (room.visible) {
        expect(room.area, room.code).not.toBeNull();
        expect(["floor", "studio"]).toContain(kindOf.get(room.area!));
      } else {
        expect(room.area, room.code).toBeNull();
      }
    }
  });

  it("hides exactly the rooms agreed in the plan", () => {
    expect(ROOMS.filter((r) => !r.visible).map((r) => r.code)).toEqual([
      "VL.01",
      "VL.02",
      "VL.03",
      "S 2.0.1",
      "S 4.4.1",
      "S 4.4.2",
    ]);
  });

  it("keeps L 6.2.1 in G7 Lantai 6", () => {
    expect(ROOMS.find((r) => r.code === "L 6.2.1")?.area).toBe("g7-l6");
  });

  it("references known areas and shifts in every seat", () => {
    for (const seat of SEATS) {
      expect(areaCodes.has(seat.area), seat.area).toBe(true);
      expect(shiftMode.has(seat.shift), seat.shift).toBe(true);
    }
  });

  it("gives lab and studio staff 16 lecture seats per day, like the old roster", () => {
    const lectureStaffSeats = SEATS.filter(
      (s) => shiftMode.get(s.shift) === "lecture" && kindOf.get(s.area) !== "building",
    ).reduce((sum, s) => sum + s.capacity, 0);
    expect(lectureStaffSeats).toBe(16);
  });

  it("uses whole-building seats in maintenance", () => {
    const maintenance = SEATS.filter((s) => shiftMode.get(s.shift) === "maintenance");
    expect(maintenance.map((s) => [s.area, s.capacity])).toEqual([
      ["studio-g2", 4],
      ["g2", 14],
      ["g7", 14],
    ]);
  });
});

describe("weekStartIso", () => {
  it("returns the Monday of the week", () => {
    expect(weekStartIso("2026-09-30")).toBe("2026-09-28"); // Wednesday
    expect(weekStartIso("2026-09-28")).toBe("2026-09-28"); // Monday
    expect(weekStartIso("2026-10-04")).toBe("2026-09-28"); // Sunday
  });
});
