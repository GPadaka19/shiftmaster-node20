import "server-only";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityEvents } from "@/lib/db/schema";
import { ACTIVITY_RETENTION_DAYS } from "./constants";

export type SignInMethod = "pin" | "google";

/**
 * Records a sign-in and drops events past the retention window. Telemetry must
 * never block a sign-in, so failures are only logged.
 */
export async function recordSignIn(memberId: number, method: SignInMethod): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await db.delete(activityEvents).where(lt(activityEvents.createdAt, cutoff));
    await db.insert(activityEvents).values({ memberId, kind: "sign_in", label: method });
  } catch (error) {
    console.error(`[activity] sign-in not recorded: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export type BrowserEvent = { kind: "page_view" | "click"; label: string; path: string };

/** Stores events reported by the member's browser. */
export async function recordBrowserEvents(memberId: number, events: BrowserEvent[]): Promise<void> {
  if (events.length === 0) return;
  await db.insert(activityEvents).values(events.map((event) => ({ memberId, ...event })));
}
