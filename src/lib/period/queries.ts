import "server-only";
import { and, gte, lte } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { holidays, periods } from "@/lib/db/schema";
import { todayIso } from "@/lib/time";
import { resolveMode, type ModeResolution } from "./resolve";

/** The app's mode today (WIB), from the periods table. */
export const getModeToday = cache(async (): Promise<ModeResolution & { today: string }> => {
  const today = todayIso();
  const rows = await db
    .select({ name: periods.name, mode: periods.mode, startDate: periods.startDate, endDate: periods.endDate })
    .from(periods);
  return { ...resolveMode(rows, today), today };
});

/** Holidays between two dates ("yyyy-MM-dd", inclusive), keyed by date. */
export const getHolidays = cache(async (from: string, to: string) => {
  const rows = await db
    .select()
    .from(holidays)
    .where(and(gte(holidays.date, from), lte(holidays.date, to)));
  return new Map(rows.map((row) => [row.date, row]));
});
