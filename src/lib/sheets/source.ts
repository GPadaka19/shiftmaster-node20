import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sheetSnapshots } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { isAgendaStillLoading, parseAgenda, type AgendaEntry } from "./agenda";
import { batchGetValues, getValues, SheetsNotConfiguredError } from "./client";
import { parseTimetable, TIMETABLE_BLOCKS, type TimetableDay } from "./timetable";

// Each sheet is cached in memory for 15 minutes. When the cache is older than
// that, the old copy is served while a refresh runs in the background. The last
// good copy is also kept in sheet_snapshots, so a restart or a Sheets outage
// still shows data (with its "Diperbarui" time).

const TTL_MS = 15 * 60 * 1000;
const AGENDA_LOADING_RETRIES = 3;
const AGENDA_LOADING_DELAY_MS = 2000;

type SourceName = "timetable" | "agenda";

export type SheetResult<T> = {
  data: T | null;
  /** When `data` was read from Google Sheets. */
  fetchedAt: Date | null;
  /** Why the most recent read failed; null when it succeeded. */
  error: string | null;
};

type Entry = {
  loaded?: { data: unknown; fetchedAt: Date };
  inflight?: Promise<void>;
  error: string | null;
  checkedSnapshot: boolean;
};

const globalCache = globalThis as unknown as { shiftmasterSheets?: Map<SourceName, Entry> };
const cache = (globalCache.shiftmasterSheets ??= new Map());

function entryFor(name: SourceName): Entry {
  let entry = cache.get(name);
  if (!entry) {
    entry = { error: null, checkedSnapshot: false };
    cache.set(name, entry);
  }
  return entry;
}

async function fetchTimetable(): Promise<TimetableDay[]> {
  const { SOURCE_SPREADSHEET_ID, SOURCE_READ_RANGE } = env();
  if (!SOURCE_SPREADSHEET_ID || !SOURCE_READ_RANGE) throw new SheetsNotConfiguredError();

  // Only the sheet name of "JADWAL!A1:Z200" is used; each day has fixed rows.
  const sheet = SOURCE_READ_RANGE.split("!")[0];
  const blocks = await batchGetValues(
    SOURCE_SPREADSHEET_ID,
    TIMETABLE_BLOCKS.map((block) => `${sheet}!${block.range}`),
  );
  return parseTimetable(blocks);
}

async function fetchAgenda(): Promise<AgendaEntry[]> {
  const { M_SOURCE_SPREADSHEET_ID, M_SOURCE_READ_RANGE } = env();
  if (!M_SOURCE_SPREADSHEET_ID || !M_SOURCE_READ_RANGE) throw new SheetsNotConfiguredError();

  // The sheet fills itself with IMPORTRANGE and can still show "Loading...".
  let rows: unknown[][] = [];
  for (let attempt = 1; attempt <= AGENDA_LOADING_RETRIES; attempt++) {
    rows = await getValues(M_SOURCE_SPREADSHEET_ID, M_SOURCE_READ_RANGE);
    if (!isAgendaStillLoading(rows) || attempt === AGENDA_LOADING_RETRIES) break;
    await new Promise((resolve) => setTimeout(resolve, AGENDA_LOADING_DELAY_MS));
  }
  return parseAgenda(rows);
}

const FETCHERS: Record<SourceName, () => Promise<unknown>> = {
  timetable: fetchTimetable,
  agenda: fetchAgenda,
};

/** Fetches once even when many requests ask at the same time. */
function refresh(name: SourceName): Promise<void> {
  const entry = entryFor(name);
  entry.inflight ??= (async () => {
    try {
      const data = await FETCHERS[name]();
      const fetchedAt = new Date();
      entry.loaded = { data, fetchedAt };
      entry.error = null;
      await db
        .insert(sheetSnapshots)
        .values({ source: name, fetchedAt, payload: data, lastError: null, lastErrorAt: null })
        .onConflictDoUpdate({
          target: sheetSnapshots.source,
          set: { fetchedAt, payload: data, lastError: null, lastErrorAt: null },
        });
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      console.error(`[sheets] ${name} refresh failed: ${entry.error}`);
      await db
        .update(sheetSnapshots)
        .set({ lastError: entry.error, lastErrorAt: new Date() })
        .where(eq(sheetSnapshots.source, name))
        .catch(() => {});
    } finally {
      entry.inflight = undefined;
    }
  })();
  return entry.inflight;
}

async function read<T>(name: SourceName): Promise<SheetResult<T>> {
  const entry = entryFor(name);

  if (!entry.loaded && !entry.checkedSnapshot) {
    entry.checkedSnapshot = true;
    const [snapshot] = await db.select().from(sheetSnapshots).where(eq(sheetSnapshots.source, name));
    if (snapshot) entry.loaded = { data: snapshot.payload, fetchedAt: snapshot.fetchedAt };
  }

  if (!entry.loaded) {
    await refresh(name);
  } else if (Date.now() - entry.loaded.fetchedAt.getTime() > TTL_MS) {
    void refresh(name);
  }

  return {
    data: (entry.loaded?.data as T | undefined) ?? null,
    fetchedAt: entry.loaded?.fetchedAt ?? null,
    error: entry.error,
  };
}

/** The weekly lecture timetable, Monday to Friday. */
export function getTimetable(): Promise<SheetResult<TimetableDay[]>> {
  return read<TimetableDay[]>("timetable");
}

/** Lab bookings and maintenance activities, by date. */
export function getAgenda(): Promise<SheetResult<AgendaEntry[]>> {
  return read<AgendaEntry[]>("agenda");
}

/** Reads Google Sheets now, ignoring the cache. For the admin status page. */
export async function refreshNow(name: SourceName): Promise<SheetResult<unknown>> {
  await refresh(name);
  return read(name);
}
