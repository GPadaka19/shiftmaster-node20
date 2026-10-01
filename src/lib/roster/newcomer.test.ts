import { describe, expect, it } from "vitest";
import { firstRosterWeek, g2RuleFor, g7OnlyUntil } from "./newcomer";

const lab = (startedOn: string | null, maxG2PerWeek: number | null = null) => ({ pool: "lab", startedOn, maxG2PerWeek });

describe("firstRosterWeek", () => {
  it("is the week of a weekday start", () => {
    expect(firstRosterWeek("2026-10-07")).toBe("2026-10-05");
  });

  it("moves a weekend start to the next Monday", () => {
    expect(firstRosterWeek("2026-10-10")).toBe("2026-10-12");
    expect(firstRosterWeek("2026-10-11")).toBe("2026-10-12");
  });
});

describe("g7OnlyUntil", () => {
  it("covers four roster weeks and ends on a Friday", () => {
    const member = lab("2026-10-07");
    expect(g7OnlyUntil(member, "2026-10-05")).toBe("2026-10-30");
    expect(g7OnlyUntil(member, "2026-10-26")).toBe("2026-10-30");
    expect(g7OnlyUntil(member, "2026-11-02")).toBeNull();
  });

  it("does not apply to studio staff or members without a start date", () => {
    expect(g7OnlyUntil({ pool: "studio", startedOn: "2026-10-07" }, "2026-10-05")).toBeNull();
    expect(g7OnlyUntil(lab(null), "2026-10-05")).toBeNull();
  });
});

describe("g2RuleFor", () => {
  it("caps newcomers at 0 G2 shifts", () => {
    expect(g2RuleFor(lab("2026-10-07", 3), "2026-10-12", 2)).toEqual({ maxG2: 0, g7OnlyUntil: "2026-10-30" });
  });

  it("uses the member's own cap or the default afterwards", () => {
    expect(g2RuleFor(lab("2026-10-07", 3), "2026-11-02", 2)).toEqual({ maxG2: 3, g7OnlyUntil: null });
    expect(g2RuleFor(lab(null), "2026-10-05", 2)).toEqual({ maxG2: 2, g7OnlyUntil: null });
    expect(g2RuleFor({ pool: "studio", startedOn: null, maxG2PerWeek: null }, "2026-10-05", 2)).toEqual({ maxG2: null, g7OnlyUntil: null });
  });
});
