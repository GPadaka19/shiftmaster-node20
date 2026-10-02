import { describe, expect, it } from "vitest";
import {
  INSTALL_CARD_MAX_DISMISSALS,
  INSTALL_CARD_SNOOZE_DAYS,
  NO_DISMISSALS,
  parseDismissals,
  recordDismissal,
  shouldShowInstallCard,
} from "./install-rules";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 2);
const base = { status: "available", pathname: "/", dismissals: NO_DISMISSALS, now: NOW } as const;

describe("shouldShowInstallCard", () => {
  it("shows when the browser can install and nothing was dismissed", () => {
    expect(shouldShowInstallCard(base)).toBe(true);
    expect(shouldShowInstallCard({ ...base, status: "ios" })).toBe(true);
  });

  it("stays hidden when installed, undecided, or the browser offers no way to install", () => {
    for (const status of ["installed", "unknown", "manual"] as const) {
      expect(shouldShowInstallCard({ ...base, status })).toBe(false);
    }
  });

  it("stays off the account page, which has the permanent button", () => {
    expect(shouldShowInstallCard({ ...base, pathname: "/account" })).toBe(false);
  });

  it("snoozes after a dismissal and comes back afterwards", () => {
    const dismissals = recordDismissal(NO_DISMISSALS, NOW);
    expect(shouldShowInstallCard({ ...base, dismissals, now: NOW + (INSTALL_CARD_SNOOZE_DAYS - 1) * DAY })).toBe(false);
    expect(shouldShowInstallCard({ ...base, dismissals, now: NOW + INSTALL_CARD_SNOOZE_DAYS * DAY })).toBe(true);
  });

  it("gives up after the maximum number of dismissals", () => {
    let dismissals = NO_DISMISSALS;
    for (let i = 0; i < INSTALL_CARD_MAX_DISMISSALS; i++) dismissals = recordDismissal(dismissals, NOW);
    expect(shouldShowInstallCard({ ...base, dismissals, now: NOW + 365 * DAY })).toBe(false);
  });
});

describe("parseDismissals", () => {
  it("round-trips what recordDismissal produces", () => {
    const stored = recordDismissal(NO_DISMISSALS, NOW);
    expect(parseDismissals(JSON.stringify(stored))).toEqual(stored);
  });

  it("treats missing or broken storage as never dismissed", () => {
    for (const raw of [null, "", "nope", "[]", '{"count":-1}', '{"count":"2"}']) {
      expect(parseDismissals(raw)).toEqual(NO_DISMISSALS);
    }
  });
});
