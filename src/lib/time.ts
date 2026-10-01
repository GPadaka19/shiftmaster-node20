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
