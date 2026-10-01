import { cellString, parseIndonesianDate, type SheetRow } from "./cells";

// Column order of the AgendaLab sheet.
const COL = {
  number: 0,
  inputDate: 1,
  email: 2,
  day: 3,
  date: 4,
  time: 5,
  period: 6,
  lab: 7,
  software: 8,
  course: 9,
  studyProgram: 10,
  className: 11,
  borrower: 12,
  notes: 13,
} as const;

/** NO through LAB: the narrowest row an entry can be built from. */
const MIN_COLUMNS = COL.lab + 1;

const SHEET_ERRORS = new Set(["#REF!", "#N/A", "#ERROR!", "#VALUE!", "#NAME?", "#DIV/0!"]);

/**
 * One booking or maintenance activity. The borrower's email and the form
 * metadata (row number, input date) are dropped here on purpose, so they never
 * reach the cache, the database snapshot, or the browser.
 */
export type AgendaEntry = {
  /** "yyyy-MM-dd", or null when the sheet's date could not be read. */
  date: string | null;
  /** The date as written in the sheet, shown when `date` is null. */
  dateLabel: string;
  /** e.g. "08:30-15:00", "08.30 - 16.00", "08:30-Selesai" */
  time: string;
  lab: string;
  software: string;
  course: string;
  studyProgram: string;
  className: string;
  borrower: string;
  notes: string;
  isMaintenance: boolean;
};

function isHeaderRow(row: SheetRow): boolean {
  const is = (index: number, title: string) => cellString(row, index).toUpperCase() === title;
  return is(COL.number, "NO") || is(COL.day, "HARI") || is(COL.date, "TANGGAL") || is(COL.time, "JAM") || is(COL.lab, "LAB");
}

/** IMPORTRANGE placeholders ("Loading...") and formula errors are not data. */
function isPlaceholderRow(row: SheetRow): boolean {
  for (let i = 0; i < MIN_COLUMNS && i < row.length; i++) {
    const value = cellString(row, i).toUpperCase();
    if (value.startsWith("LOADING") || SHEET_ERRORS.has(value)) return true;
  }
  return false;
}

/** True when IMPORTRANGE has not resolved yet: only placeholders, no real rows. */
export function isAgendaStillLoading(rows: readonly SheetRow[]): boolean {
  let placeholders = 0;
  let realRows = 0;
  for (const row of rows) {
    if (row.length < 2 || isHeaderRow(row)) continue;
    if (isPlaceholderRow(row)) placeholders++;
    else if (cellString(row, COL.number)) realRows++;
  }
  return placeholders > 0 && realRows === 0;
}

export function isMaintenanceActivity(entry: Pick<AgendaEntry, "notes" | "course" | "studyProgram">): boolean {
  return (
    entry.notes.toLowerCase().includes("maintenance") ||
    entry.course.toLowerCase().includes("maintenance") ||
    entry.studyProgram.toLowerCase().includes("laboratorium")
  );
}

/** "08.30 - 16.00" → "08:30" (used for sorting only). */
function startTime(time: string): string {
  const match = time.match(/(\d{1,2})[.:](\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "99:99";
}

/** Entries sorted by date (unreadable dates last), then start time. */
export function parseAgenda(rows: readonly SheetRow[]): AgendaEntry[] {
  const entries: AgendaEntry[] = [];

  for (const row of rows) {
    if (row.length < MIN_COLUMNS || isHeaderRow(row) || isPlaceholderRow(row)) continue;
    if (!cellString(row, COL.number)) continue;

    const dateLabel = cellString(row, COL.date);
    const entry = {
      date: parseIndonesianDate(dateLabel),
      dateLabel,
      time: cellString(row, COL.time),
      lab: cellString(row, COL.lab).replace(/\s+/g, " "),
      software: cellString(row, COL.software),
      course: cellString(row, COL.course),
      studyProgram: cellString(row, COL.studyProgram),
      className: cellString(row, COL.className),
      borrower: cellString(row, COL.borrower),
      notes: cellString(row, COL.notes),
    };
    entries.push({ ...entry, isMaintenance: isMaintenanceActivity(entry) });
  }

  return entries.sort(
    (a, b) =>
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      a.dateLabel.localeCompare(b.dateLabel) ||
      startTime(a.time).localeCompare(startTime(b.time)),
  );
}
