"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ACTIVITY_BATCH_MAX } from "@/lib/activity/constants";
import { cleanLabel } from "@/lib/activity/label";

type QueuedEvent = { kind: "page_view" | "click"; label: string; path: string };

const FLUSH_EVERY_MS = 10_000;
const CLICKABLE = "button, a[href], [role='button'], [role='tab'], [role='radio'], [role='menuitem'], summary";

const queue: QueuedEvent[] = [];
let lastViewed: string | null = null;

function enqueue(event: QueuedEvent) {
  // A full queue means sending keeps failing (offline); drop rather than grow.
  if (queue.length < ACTIVITY_BATCH_MAX) queue.push(event);
}

function flush() {
  if (queue.length === 0) return;
  const body = JSON.stringify({ events: queue.splice(0) });
  // A beacon is still delivered while the page is being closed or put in the background.
  if (navigator.sendBeacon?.("/api/activity", new Blob([body], { type: "application/json" }))) return;
  fetch("/api/activity", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

/**
 * What a press is called on the Aktivitas page: data-track, else the control's
 * accessible name or visible text. Form fields are never read.
 */
function labelOf(element: Element): string {
  const explicit = element.getAttribute("data-track") ?? element.getAttribute("aria-label") ?? element.getAttribute("title");
  return cleanLabel(explicit ?? element.textContent ?? "");
}

/** Reports the pages a member opens and the buttons they press (see /admin/activity). Renders nothing. */
export function ActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // React runs effects twice in development; count the page once.
    if (lastViewed === pathname) return;
    lastViewed = pathname;
    enqueue({ kind: "page_view", label: pathname, path: pathname });
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest(CLICKABLE) : null;
      if (!target || target.closest("[data-track-ignore]")) return;
      const label = labelOf(target);
      if (label) enqueue({ kind: "click", label, path: window.location.pathname });
    }
    function onHidden() {
      if (document.visibilityState === "hidden") flush();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    const timer = window.setInterval(flush, FLUSH_EVERY_MS);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      window.clearInterval(timer);
      flush();
    };
  }, []);

  return null;
}
