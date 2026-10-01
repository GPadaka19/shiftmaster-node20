// The five teaching slots of every weekday, and which one is happening "now".

export type Slot = {
  index: number;
  start: string;
  end: string;
  /** Minutes before `start` during which the slot counts as "incoming". */
  incomingMinutes: number;
};

export const SLOTS: readonly Slot[] = [
  { index: 0, start: "07:00", end: "08:40", incomingMinutes: 15 },
  { index: 1, start: "08:50", end: "10:30", incomingMinutes: 10 },
  { index: 2, start: "10:40", end: "12:20", incomingMinutes: 10 },
  { index: 3, start: "13:20", end: "15:00", incomingMinutes: 60 },
  { index: 4, start: "15:30", end: "17:10", incomingMinutes: 30 },
];

/** Friday 10:40–12:20 overlaps Friday prayers and is never marked now/incoming. */
const FRIDAY = 5;
const FRIDAY_PRAYER_SLOT = 2;

export type SlotTiming = "now" | "incoming" | null;

function minutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

/**
 * Whether `slot` is running or about to start, given the ISO weekday
 * (1 = Senin) and the time of day as "HH:mm", both in WIB.
 */
export function slotTiming(slot: Slot, weekday: number, time: string): SlotTiming {
  if (weekday === FRIDAY && slot.index === FRIDAY_PRAYER_SLOT) return null;

  const now = minutes(time);
  const start = minutes(slot.start);
  if (now >= start && now <= minutes(slot.end)) return "now";
  if (now >= start - slot.incomingMinutes && now < start) return "incoming";
  return null;
}

/**
 * Timing of all five slots when showing `weekday`, or undefined when that is
 * not today (another day's slots are never "now").
 */
export function slotTimings(weekday: number, todayWeekday: number, time: string): SlotTiming[] | undefined {
  if (weekday !== todayWeekday) return undefined;
  return SLOTS.map((slot) => slotTiming(slot, weekday, time));
}

/** "07:00–08:40" */
export function slotLabel(slot: Slot): string {
  return `${slot.start}–${slot.end}`;
}
