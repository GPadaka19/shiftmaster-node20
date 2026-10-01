import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes; goes into the cookie, never into the database. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the database stores, so a leaked table cannot be replayed as cookies. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
