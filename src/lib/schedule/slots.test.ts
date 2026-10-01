import { describe, expect, it } from "vitest";
import { SLOTS, slotTiming } from "./slots";

const [first, second, third, fourth, fifth] = SLOTS;

describe("slotTiming", () => {
  it("is 'now' from start to end, inclusive", () => {
    expect(slotTiming(first, 1, "07:00")).toBe("now");
    expect(slotTiming(first, 1, "08:40")).toBe("now");
    expect(slotTiming(first, 1, "08:41")).toBeNull();
  });

  it("is 'incoming' during the break before the slot", () => {
    expect(slotTiming(first, 1, "06:45")).toBe("incoming");
    expect(slotTiming(first, 1, "06:44")).toBeNull();
    expect(slotTiming(second, 1, "08:41")).toBe("incoming");
    expect(slotTiming(fourth, 1, "12:21")).toBe("incoming");
    expect(slotTiming(fifth, 1, "15:01")).toBe("incoming");
  });

  it("never marks the Friday prayer slot", () => {
    expect(slotTiming(third, 5, "11:00")).toBeNull();
    expect(slotTiming(third, 5, "10:35")).toBeNull();
    expect(slotTiming(third, 4, "11:00")).toBe("now");
    expect(slotTiming(fourth, 5, "13:30")).toBe("now");
  });
});
