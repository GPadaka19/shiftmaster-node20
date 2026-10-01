import { describe, expect, it } from "vitest";
import { memberInputSchema, selfChangeBlocked } from "./members/validation";
import { findOverlap, periodInputSchema } from "./period/validation";
import { groupByArea, roomKeysForArea, type AreaInfo, type RoomDirectory } from "./rooms/group";

const base = { nickname: "Rifat", fullName: "Rifat Pratama", role: "staff", pool: "pkl" };

describe("memberInputSchema", () => {
  it("normalizes optional fields", () => {
    const result = memberInputSchema.parse({ ...base, email: "", dutyLabel: "  " });
    expect(result).toMatchObject({ email: null, dutyLabel: null, pool: "pkl" });
    expect(memberInputSchema.parse({ ...base, pool: "none" }).pool).toBeNull();
    expect(memberInputSchema.parse({ ...base, email: "A@Example.TEST" }).email).toBe("a@example.test");
  });

  it("requires an email for admins", () => {
    const result = memberInputSchema.safeParse({ ...base, role: "admin", email: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["email"]);
  });
});

describe("selfChangeBlocked", () => {
  it("stops a superadmin demoting or deactivating themselves", () => {
    expect(selfChangeBlocked(1, 1, { role: "admin" })).not.toBeNull();
    expect(selfChangeBlocked(1, 1, { active: false })).not.toBeNull();
    expect(selfChangeBlocked(1, 1, { role: "superadmin", active: true })).toBeNull();
    expect(selfChangeBlocked(1, 2, { role: "staff", active: false })).toBeNull();
  });
});

describe("periods", () => {
  const periods = [
    { id: 1, name: "Ganjil", mode: "lecture" as const, startDate: "2026-09-01", endDate: "2027-01-15" },
    { id: 2, name: "Libur", mode: "maintenance" as const, startDate: "2027-01-16", endDate: "2027-02-28" },
  ];

  it("rejects an end date before the start", () => {
    expect(periodInputSchema.safeParse({ name: "X", mode: "lecture", startDate: "2026-02-02", endDate: "2026-02-01" }).success).toBe(false);
  });

  it("finds overlaps, touching ends included, and ignores the period being edited", () => {
    expect(findOverlap(periods, { startDate: "2027-01-15", endDate: "2027-01-20" })?.id).toBe(1);
    expect(findOverlap(periods, { startDate: "2027-03-01", endDate: "2027-06-30" })).toBeUndefined();
    expect(findOverlap(periods, { startDate: "2026-09-01", endDate: "2027-01-10" }, 1)).toBeUndefined();
  });
});

describe("rooms", () => {
  const area = (id: number, code: string, kind: AreaInfo["kind"], building: AreaInfo["building"], sortOrder: number): AreaInfo => ({
    id,
    code,
    name: code,
    kind,
    building,
    sortOrder,
  });
  const studio = area(1, "studio-g2", "studio", "G2", 10);
  const g7l3 = area(2, "g7-l3", "floor", "G7", 40);
  const g7l6 = area(3, "g7-l6", "floor", "G7", 70);
  const g7 = area(4, "g7", "building", "G7", 90);
  const directory: RoomDirectory = new Map([
    ["S2.2.8", { code: "S 2.2.8", building: "G2", floor: 2, kind: "studio", visible: true, area: studio }],
    ["L7.3.2", { code: "L 7.3.2", building: "G7", floor: 3, kind: "lab", visible: true, area: g7l3 }],
    ["L7.3.10", { code: "L 7.3.10", building: "G7", floor: 3, kind: "lab", visible: true, area: g7l3 }],
    ["S7.6.3", { code: "S 7.6.3", building: "G7", floor: 6, kind: "studio", visible: true, area: g7l6 }],
    ["VL.01", { code: "VL.01", building: null, floor: null, kind: "virtual", visible: false, area: null }],
  ]);

  it("groups by area order, hides hidden rooms and puts unknown rooms last", () => {
    const groups = groupByArea(["L 7.3.10", "VL.01", "X 9.9.9", "L 7.3.2", "S 2.2.8"], (c) => c, directory);
    expect(groups.map((g) => [g.area?.code ?? null, g.items])).toEqual([
      ["studio-g2", ["S 2.2.8"]],
      ["g7-l3", ["L 7.3.2", "L 7.3.10"]],
      [null, ["X 9.9.9"]],
    ]);
  });

  it("covers a building's floor areas but not its studio area", () => {
    expect([...roomKeysForArea(g7, directory)].sort()).toEqual(["L7.3.10", "L7.3.2", "S7.6.3"]);
    expect([...roomKeysForArea(g7l3, directory)].sort()).toEqual(["L7.3.10", "L7.3.2"]);
  });
});
