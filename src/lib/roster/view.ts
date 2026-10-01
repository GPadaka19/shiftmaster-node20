import type { AreaInfo } from "@/lib/rooms/group";

// Pure helpers over one roster week's assignments, shared by the today and roster pages.

export type ShiftInfo = {
  id: number;
  code: string;
  label: string;
  /** "HH:mm" */
  start: string;
  end: string;
  sortOrder: number;
};

export type RosterAssignment = {
  /** "yyyy-MM-dd" */
  date: string;
  area: AreaInfo;
  shift: ShiftInfo;
  member: { id: number; nickname: string };
  position: number;
};

export type RosterWeek = {
  id: number;
  /** Monday, "yyyy-MM-dd" */
  weekStart: string;
  mode: "lecture" | "maintenance";
  assignments: RosterAssignment[];
};

function byShiftThenPosition(a: RosterAssignment, b: RosterAssignment) {
  return a.shift.sortOrder - b.shift.sortOrder || a.position - b.position || a.member.nickname.localeCompare(b.member.nickname);
}

export function dutyOn(week: RosterWeek, memberId: number, date: string): RosterAssignment | null {
  return week.assignments.find((a) => a.member.id === memberId && a.date === date) ?? null;
}

/** Everyone else in the same area on the same day, morning before afternoon. */
export function teammatesOf(week: RosterWeek, duty: RosterAssignment): RosterAssignment[] {
  return week.assignments
    .filter((a) => a.date === duty.date && a.area.id === duty.area.id && a.member.id !== duty.member.id)
    .sort(byShiftThenPosition);
}

/** A member's duty for each date of the week, null on days off. */
export function weekDutiesOf(week: RosterWeek, memberId: number, dates: readonly string[]): (RosterAssignment | null)[] {
  return dates.map((date) => dutyOn(week, memberId, date));
}

export type AreaDay = {
  area: AreaInfo;
  shifts: { shift: ShiftInfo; members: RosterAssignment[] }[];
};

/**
 * One day of the roster, grouped by area and shift. `slots` lists every area
 * and shift that has seats in this mode, so empty seats still show.
 */
export function rosterDay(
  week: RosterWeek,
  date: string,
  slots: readonly { area: AreaInfo; shift: ShiftInfo }[],
): AreaDay[] {
  const areas = new Map<number, AreaDay>();
  const ordered = [...slots].sort((a, b) => a.area.sortOrder - b.area.sortOrder || a.shift.sortOrder - b.shift.sortOrder);

  for (const { area, shift } of ordered) {
    let day = areas.get(area.id);
    if (!day) {
      day = { area, shifts: [] };
      areas.set(area.id, day);
    }
    const members = week.assignments
      .filter((a) => a.date === date && a.area.id === area.id && a.shift.id === shift.id)
      .sort(byShiftThenPosition);
    day.shifts.push({ shift, members });
  }
  return [...areas.values()];
}
