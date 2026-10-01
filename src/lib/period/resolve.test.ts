import { describe, expect, it } from "vitest";
import { resolveMode, type PeriodLike } from "./resolve";

const oddSemester: PeriodLike = { name: "Ganjil", mode: "lecture", startDate: "2026-09-01", endDate: "2027-01-15" };
const semesterBreak: PeriodLike = { name: "Libur Ganjil", mode: "maintenance", startDate: "2027-01-16", endDate: "2027-02-28" };

describe("resolveMode", () => {
  it("uses the period that covers today, including both end dates", () => {
    expect(resolveMode([oddSemester, semesterBreak], "2026-09-01")).toMatchObject({ mode: "lecture", source: "period" });
    expect(resolveMode([oddSemester, semesterBreak], "2027-01-15")).toMatchObject({ mode: "lecture", source: "period" });
    expect(resolveMode([oddSemester, semesterBreak], "2027-01-16")).toMatchObject({ mode: "maintenance", source: "period" });
  });

  it("prefers the later-starting period when two overlap", () => {
    const overlap: PeriodLike = { name: "Libur awal", mode: "maintenance", startDate: "2027-01-10", endDate: "2027-01-20" };
    expect(resolveMode([oddSemester, overlap], "2027-01-12").period?.name).toBe("Libur awal");
  });

  it("falls back to the most recent past period in a gap", () => {
    const result = resolveMode([oddSemester, semesterBreak], "2027-03-05");
    expect(result).toMatchObject({ mode: "maintenance", source: "previous" });
    expect(result.period?.name).toBe("Libur Ganjil");
  });

  it("defaults to lecture when there is no usable period", () => {
    expect(resolveMode([], "2026-09-30")).toEqual({ mode: "lecture", period: null, source: "default" });
    expect(resolveMode([semesterBreak], "2026-09-30")).toEqual({ mode: "lecture", period: null, source: "default" });
  });
});
