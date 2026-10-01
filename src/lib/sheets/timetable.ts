import { cellString, type SheetRow } from "./cells";

// The JADWAL sheet holds one block of rows per weekday. Column C is the room
// code and D..H are the five fixed time slots. Row numbers are fixed by the
// sheet layout; if the sheet moves, only this table changes.
export const TIMETABLE_BLOCKS = [
  { weekday: 1, range: "C6:H33" },
  { weekday: 2, range: "C35:H62" },
  { weekday: 3, range: "C64:H91" },
  { weekday: 4, range: "C93:H120" },
  { weekday: 5, range: "C122:H149" },
] as const;

export const SLOT_COUNT = 5;

export type SessionStatus = "planned" | "empty" | "booked" | "conflict";

export type Session = {
  status: SessionStatus;
  course: string;
  className: string;
  lecturer: string;
};

export type TimetableRoom = {
  /** As written in the sheet, e.g. "L 7.3.2". */
  code: string;
  /** Always SLOT_COUNT entries, in slot order. */
  sessions: Session[];
};

export type TimetableDay = { weekday: number; rooms: TimetableRoom[] };

/**
 * A slot cell is "Course | Class | Lecturer" or "Course | Lecturer".
 * "BOOKED" anywhere marks a booking; "- XX" marks a clash flagged by the sheet.
 */
export function parseSessionCell(raw: string): Session {
  const text = raw.trim();
  if (!text) return { status: "empty", course: "", className: "", lecturer: "" };

  let status: SessionStatus = "planned";
  if (text.toUpperCase().includes("BOOKED")) status = "booked";
  else if (text.includes("- XX")) status = "conflict";

  const parts = text.split("|").map((part) => part.trim());
  if (parts.length >= 3) return { status, course: parts[0], className: parts[1], lecturer: parts[2] };
  if (parts.length === 2) return { status, course: parts[0], className: "", lecturer: parts[1] };
  return { status, course: parts[0], className: "", lecturer: "" };
}

/** Rows of one weekday block. A room listed twice keeps its last row. */
export function parseTimetableBlock(rows: readonly SheetRow[]): TimetableRoom[] {
  const rooms = new Map<string, TimetableRoom>();
  for (const row of rows) {
    const code = cellString(row, 0).replace(/\s+/g, " ");
    if (!code) continue;
    const sessions = Array.from({ length: SLOT_COUNT }, (_, slot) => parseSessionCell(cellString(row, slot + 1)));
    rooms.delete(code);
    rooms.set(code, { code, sessions });
  }
  return [...rooms.values()];
}

/** `blocks[i]` holds the rows of TIMETABLE_BLOCKS[i]. */
export function parseTimetable(blocks: readonly (readonly SheetRow[])[]): TimetableDay[] {
  return TIMETABLE_BLOCKS.map((block, index) => ({
    weekday: block.weekday,
    rooms: parseTimetableBlock(blocks[index] ?? []),
  }));
}
