import { describe, expect, it } from "vitest";
import { PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS } from "./constants";
import { hashPin, isPinLocked, isValidPin, normalizeNickname, registerPinFailure, verifyPin } from "./pin";
import { safeNextPath } from "./redirect";
import { hasRole } from "./roles";
import { generateSessionToken, hashSessionToken } from "./token";

describe("normalizeNickname", () => {
  it("trims, collapses spaces and lowercases", () => {
    expect(normalizeNickname("  Budi   Santoso ")).toBe("budi santoso");
    expect(normalizeNickname("RIFAT")).toBe("rifat");
  });
});

describe("PIN", () => {
  it("accepts 4 to 8 digits only", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin(" 1234")).toBe(false);
  });

  it("verifies against its hash", async () => {
    const hash = await hashPin("4821");
    expect(await verifyPin("4821", hash)).toBe(true);
    expect(await verifyPin("4822", hash)).toBe(false);
  });
});

describe("PIN lockout", () => {
  const now = new Date("2026-09-30T08:00:00Z");

  it("counts failures below the limit without locking", () => {
    expect(registerPinFailure(0, now)).toEqual({ failedPinAttempts: 1, pinLockedUntil: null });
    expect(registerPinFailure(PIN_MAX_ATTEMPTS - 2, now)).toEqual({
      failedPinAttempts: PIN_MAX_ATTEMPTS - 1,
      pinLockedUntil: null,
    });
  });

  it("locks on the last allowed failure and resets the counter", () => {
    const state = registerPinFailure(PIN_MAX_ATTEMPTS - 1, now);
    expect(state.failedPinAttempts).toBe(0);
    expect(state.pinLockedUntil?.getTime()).toBe(now.getTime() + PIN_LOCK_MINUTES * 60_000);
  });

  it("is locked only until the lock time passes", () => {
    const until = new Date(now.getTime() + 60_000);
    expect(isPinLocked(until, now)).toBe(true);
    expect(isPinLocked(until, until)).toBe(false);
    expect(isPinLocked(null, now)).toBe(false);
  });
});

describe("session token", () => {
  it("is random, URL-safe and hashed deterministically", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashSessionToken(a)).toBe(hashSessionToken(a));
    expect(hashSessionToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hasRole", () => {
  it("orders superadmin > admin > staff", () => {
    expect(hasRole("superadmin", "admin")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("staff", "admin")).toBe(false);
    expect(hasRole("admin", "superadmin")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/roster?minggu=2026-10-05")).toBe("/roster?minggu=2026-10-05");
  });

  it("rejects anything that could leave the site or loop back to login", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("/masuk")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
