/** A row as returned by the Sheets API: strings, numbers, booleans, or holes. */
export type SheetRow = readonly unknown[];

/**
 * One cell as trimmed text. The API usually sends strings, but numbers and
 * checkboxes can arrive typed; reading them as text keeps an occupied slot
 * from looking empty.
 */
export function cellString(row: SheetRow, index: number): string {
  const value = row[index];
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value).replace(/ /g, " ").trim();
}

/**
 * Key for matching room codes written slightly differently across sheets:
 * "L 7.3.2", "l7.3.2", "L 7.3.2" all become "L7.3.2".
 */
export function roomKey(code: string): string {
  return code.replace(/[\s ]+/g, "").toUpperCase();
}

const MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

/** "20 Januari 2026" → "2026-01-20", or null when it is not such a date. */
export function parseIndonesianDate(value: string): string | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = MONTHS[parts[1].toLowerCase()];
  const year = Number(parts[2]);
  if (!Number.isInteger(day) || day < 1 || day > 31 || !month || !Number.isInteger(year) || year < 1000) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day) return null; // e.g. 31 Februari
  return date.toISOString().slice(0, 10);
}
