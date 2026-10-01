import bcrypt from "bcryptjs";
import { PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS } from "./constants";

/** 6–8 digits, so it can be typed on a phone's number pad. */
export const PIN_PATTERN = /^\d{6,8}$/;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/** "  Budi   Santoso " → "budi santoso". Nicknames are unique after this. */
export function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isPinLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil > now;
}

/**
 * State after one wrong PIN. The fifth wrong try locks the member for
 * PIN_LOCK_MINUTES and resets the counter.
 */
export function registerPinFailure(
  failedAttempts: number,
  now: Date,
): { failedPinAttempts: number; pinLockedUntil: Date | null } {
  const attempts = failedAttempts + 1;
  if (attempts >= PIN_MAX_ATTEMPTS) {
    return {
      failedPinAttempts: 0,
      pinLockedUntil: new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000),
    };
  }
  return { failedPinAttempts: attempts, pinLockedUntil: null };
}
