import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO } from "date-fns";
import { id } from "date-fns/locale/id";

// Every date and time in the app is Jakarta time (WIB), whatever the server's
// own time zone is.
export const TIME_ZONE = "Asia/Jakarta";

/** The current moment, with calendar getters in WIB. */
export function nowInJakarta(now: Date = new Date()): TZDate {
  return new TZDate(now, TIME_ZONE);
}

/** Today's date in WIB as "yyyy-MM-dd". */
export function todayIso(now: Date = new Date()): string {
  return format(nowInJakarta(now), "yyyy-MM-dd");
}

/** Monday of the week containing `isoDate`. */
export function weekStartIso(isoDate: string): string {
  const date = parseISO(isoDate);
  const isoWeekday = date.getDay() === 0 ? 7 : date.getDay();
  return format(addDays(date, 1 - isoWeekday), "yyyy-MM-dd");
}

/** "Selasa, 30 September 2026" */
export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE, d MMMM yyyy", { locale: id });
}

/** "30 Sep 2026" */
export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM yyyy", { locale: id });
}

/** "30 Sep 2026, 14.05" in WIB. */
export function formatDateTime(moment: Date): string {
  return format(nowInJakarta(moment), "d MMM yyyy, HH.mm", { locale: id });
}

/** "14.05" in WIB. */
export function formatClock(moment: Date): string {
  return format(nowInJakarta(moment), "HH.mm");
}

/** "HH:mm" in WIB, for comparing against slot times. */
export function timeOfDay(moment: Date = new Date()): string {
  return format(nowInJakarta(moment), "HH:mm");
}

/** ISO weekday of "yyyy-MM-dd": 1 = Senin … 7 = Minggu. */
export function isoWeekday(isoDate: string): number {
  const day = parseISO(isoDate).getDay();
  return day === 0 ? 7 : day;
}

export function addDaysIso(isoDate: string, days: number): string {
  return format(addDays(parseISO(isoDate), days), "yyyy-MM-dd");
}

/** "28 Sep – 2 Okt 2026" for a Monday–Friday week. */
export function formatWeekRange(weekStart: string): string {
  const friday = parseISO(addDaysIso(weekStart, 4));
  return `${format(parseISO(weekStart), "d MMM", { locale: id })} – ${format(friday, "d MMM yyyy", { locale: id })}`;
}

/** True for a "yyyy-MM-dd" string that is a real Monday. */
export function isMondayIso(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime()) && isoWeekday(value) === 1;
}

export const WEEKDAY_NAMES =["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
export const WEEKDAY_SHORT = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;
