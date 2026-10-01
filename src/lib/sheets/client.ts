import "server-only";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/lib/env";

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const TIMEOUT_MS = 15_000;

export class SheetsNotConfiguredError extends Error {
  constructor() {
    super("Google Sheets belum dikonfigurasi (GOOGLE_SHEETS_* di environment).");
  }
}

let client: OAuth2Client | undefined;

/** OAuth client acting as the campus account; refreshes its access token itself. */
function sheetsClient(): OAuth2Client {
  const { GOOGLE_SHEETS_CLIENT_ID, GOOGLE_SHEETS_CLIENT_SECRET, GOOGLE_SHEETS_REFRESH_TOKEN } = env();
  if (!GOOGLE_SHEETS_CLIENT_ID || !GOOGLE_SHEETS_CLIENT_SECRET || !GOOGLE_SHEETS_REFRESH_TOKEN) {
    throw new SheetsNotConfiguredError();
  }
  if (!client) {
    client = new OAuth2Client({ clientId: GOOGLE_SHEETS_CLIENT_ID, clientSecret: GOOGLE_SHEETS_CLIENT_SECRET });
    client.setCredentials({ refresh_token: GOOGLE_SHEETS_REFRESH_TOKEN });
  }
  return client;
}

type ValueRange = { values?: unknown[][] };

/** A short reason without tokens or URLs, safe to log and to show admins. */
function describeError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const reason =
    (error as { response?: { data?: { error?: { message?: string } | string; error_description?: string } } })?.response?.data;
  const message =
    (typeof reason?.error === "object" ? reason.error.message : undefined) ??
    reason?.error_description ??
    (typeof reason?.error === "string" ? reason.error : undefined) ??
    (error instanceof Error ? error.message : String(error));
  return status ? `Google Sheets ${status}: ${message}` : `Google Sheets: ${message}`;
}

async function request<T>(url: URL): Promise<T> {
  try {
    const response = await sheetsClient().request<T>({ url: url.toString(), timeout: TIMEOUT_MS });
    return response.data;
  } catch (error) {
    if (error instanceof SheetsNotConfiguredError) throw error;
    throw new Error(describeError(error));
  }
}

/** Values of several ranges in one call, in the order asked. */
export async function batchGetValues(spreadsheetId: string, ranges: readonly string[]): Promise<unknown[][][]> {
  const url = new URL(`${API}/${encodeURIComponent(spreadsheetId)}/values:batchGet`);
  for (const range of ranges) url.searchParams.append("ranges", range);
  const data = await request<{ valueRanges?: ValueRange[] }>(url);
  return ranges.map((_, i) => data.valueRanges?.[i]?.values ?? []);
}

export async function getValues(spreadsheetId: string, range: string): Promise<unknown[][]> {
  const url = new URL(`${API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`);
  const data = await request<ValueRange>(url);
  return data.values ?? [];
}
