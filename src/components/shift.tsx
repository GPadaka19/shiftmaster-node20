import { Clock, Sun, Sunset, type LucideIcon, type LucideProps } from "lucide-react";

const SHIFT_ICON: Record<string, LucideIcon> = { morning: Sun, afternoon: Sunset };

/** Sun for the morning shift, sunset for the afternoon, a clock otherwise. */
export function shiftIcon(code: string): LucideIcon {
  return SHIFT_ICON[code] ?? Clock;
}

/** shiftIcon(code) as an element. */
export function ShiftIcon({ code, ...props }: LucideProps & { code: string }) {
  const Icon = SHIFT_ICON[code] ?? Clock;
  return <Icon {...props} />;
}

/** "06:30–14:30" */
export function shiftTime(shift: { start: string; end: string }): string {
  return `${shift.start}–${shift.end}`;
}
