import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { periods } from "@/lib/db/schema";
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
