import { describe, expect, it } from "vitest";
import type { AreaInfo } from "@/lib/rooms/group";
import { dutyOn, rosterDay, teammatesOf, weekDutiesOf, type RosterAssignment, type RosterWeek, type ShiftInfo } from "./view";

const studio: AreaInfo = { id: 1, code: "studio-g2", name: "Studio G2", building: "G2", kind: "studio", sortOrder: 10 };
const g7l3: AreaInfo = { id: 2, code: "g7-l3", name: "G7 Lantai 3", building: "G7", kind: "floor", sortOrder: 40 };
const morning: ShiftInfo = { id: 1, code: "morning", label: "Pagi", start: "06:30", end: "14:30", sortOrder: 10 };
const afternoon: ShiftInfo = { id: 2, code: "afternoon", label: "Siang", start: "09:30", end: "17:30", sortOrder: 20 };

/** Member ids are the first letter's char code, so tests can look them up by name. */
function seat(date: string, area: AreaInfo, shift: ShiftInfo, nickname: string, position = 1): RosterAssignment {
  return { date, area, shift, member: { id: nickname.charCodeAt(0), nickname }, position };
}

const week: RosterWeek = {
  id: 1,
  weekStart: "2026-09-28",
  mode: "lecture",
  assignments: [
    seat("2026-09-28", g7l3, afternoon, "Budi"),
    seat("2026-09-28", g7l3, morning, "Ani"),
    seat("2026-09-28", studio, morning, "Citra", 1),
    seat("2026-09-28", studio, morning, "Dodi", 2),
    seat("2026-09-29", g7l3, morning, "Budi"),
  ],
};

describe("roster view", () => {
  it("finds a member's duty on a date", () => {
    expect(dutyOn(week, "B".charCodeAt(0), "2026-09-28")?.shift.code).toBe("afternoon");
    expect(dutyOn(week, "B".charCodeAt(0), "2026-09-30")).toBeNull();
  });

  it("lists teammates in the same area that day, Pagi first", () => {
    const duty = dutyOn(week, "B".charCodeAt(0), "2026-09-28")!;
    expect(teammatesOf(week, duty).map((a) => a.member.nickname)).toEqual(["Ani"]);
    const studioDuty = dutyOn(week, "C".charCodeAt(0), "2026-09-28")!;
    expect(teammatesOf(week, studioDuty).map((a) => a.member.nickname)).toEqual(["Dodi"]);
  });

  it("summarises a member's week", () => {
    const duties = weekDutiesOf(week, "B".charCodeAt(0), ["2026-09-28", "2026-09-29", "2026-09-30"]);
    expect(duties.map((d) => d?.shift.code ?? null)).toEqual(["afternoon", "morning", null]);
  });

  it("builds a day with every slot, empty ones included", () => {
    const day = rosterDay(week, "2026-09-29", [
      { area: g7l3, shift: afternoon },
      { area: studio, shift: morning },
      { area: g7l3, shift: morning },
    ]);
    expect(day.map((d) => d.area.code)).toEqual(["studio-g2", "g7-l3"]);
    expect(day[0].shifts.map((s) => [s.shift.code, s.members.length])).toEqual([["morning", 0]]);
    expect(day[1].shifts.map((s) => [s.shift.code, s.members.map((m) => m.member.nickname)])).toEqual([
      ["morning", ["Budi"]],
      ["afternoon", []],
    ]);
  });
});
