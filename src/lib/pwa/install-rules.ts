// When the floating "Pasang Shift Master" card may appear. Tweak the numbers
// here; the permanent button on the account page ignores all of them.

/** Wait this long after a page opens, so the card never covers what the member came for. */
export const INSTALL_CARD_DELAY_MS = 8_000;
/** After "Nanti saja" or the close button, stay away this many days. */
export const INSTALL_CARD_SNOOZE_DAYS = 14;
/** After this many dismissals the card never comes back on this device. */
export const INSTALL_CARD_MAX_DISMISSALS = 3;
/** The card is not shown on these pages (the account page has its own button). */
export const INSTALL_CARD_HIDDEN_PATHS = ["/account"];

export const INSTALL_DISMISSALS_STORAGE_KEY = "install-card";

/**
 * unknown: not decided yet (server render, first paint). available: the browser
 * offers its install dialog. ios: Safari on iPhone/iPad, installed by hand from
 * the share menu. manual: no dialog offered. installed: running as the app.
 */
export type InstallStatus = "unknown" | "available" | "ios" | "manual" | "installed";

export type InstallDismissals = { count: number; lastAt: number | null };

export const NO_DISMISSALS: InstallDismissals = { count: 0, lastAt: null };

/** Reads what dismiss() stored; anything unreadable counts as never dismissed. */
export function parseDismissals(raw: string | null): InstallDismissals {
  if (!raw) return NO_DISMISSALS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return NO_DISMISSALS;
    const { count, lastAt } = value as Record<string, unknown>;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return NO_DISMISSALS;
    return { count, lastAt: typeof lastAt === "number" ? lastAt : null };
  } catch {
    return NO_DISMISSALS;
  }
}

export function recordDismissal(previous: InstallDismissals, now: number): InstallDismissals {
  return { count: previous.count + 1, lastAt: now };
}

/** Whether the floating card may show right now (the delay is the component's job). */
export function shouldShowInstallCard(input: {
  status: InstallStatus;
  pathname: string;
  dismissals: InstallDismissals;
  now: number;
}): boolean {
  const { status, pathname, dismissals, now } = input;
  // Only where installing is actually possible: the browser's dialog, or Safari's share menu.
  if (status !== "available" && status !== "ios") return false;
  if (INSTALL_CARD_HIDDEN_PATHS.includes(pathname)) return false;
  if (dismissals.count >= INSTALL_CARD_MAX_DISMISSALS) return false;
  if (dismissals.lastAt !== null && now - dismissals.lastAt < INSTALL_CARD_SNOOZE_DAYS * 24 * 60 * 60 * 1000) return false;
  return true;
}
