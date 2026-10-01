import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { members, sessions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "./constants";
import { hasRole, type Role } from "./roles";
import { generateSessionToken, hashSessionToken } from "./token";

/** What the rest of the app may know about the signed-in member. */
export type CurrentMember = {
  id: number;
  nickname: string;
  fullName: string;
  email: string | null;
  role: Role;
  pool: "lab" | "studio" | "pkl" | null;
  dutyLabel: string | null;
  /** Staff with a PIN given by an admin must choose their own before using the app. */
  pinMustChange: boolean;
};

/** Starts a session and sets the cookie. Server Actions and Route Handlers only. */
export async function createSession(memberId: number): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({ tokenHash: hashSessionToken(token), memberId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Ends the current session and clears the cookie. Server Actions only. */
export async function endCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  store.delete(SESSION_COOKIE);
}

/** Signs a member out everywhere, e.g. after a role, status or PIN change. */
export async function revokeMemberSessions(memberId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.memberId, memberId));
}

/**
 * The signed-in member, or null. Checks the database on every request, so a
 * deactivated member or revoked session is locked out immediately.
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [member] = await db
    .select({
      id: members.id,
      nickname: members.nickname,
      fullName: members.fullName,
      email: members.email,
      role: members.role,
      pool: members.pool,
      dutyLabel: members.dutyLabel,
      pinMustChange: members.pinMustChange,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
        eq(members.active, true),
      ),
    )
    .limit(1);

  return member ?? null;
});

/** The signed-in member; sends them to /masuk, or to /ganti-pin while their PIN is one an admin gave them. */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/masuk");
  if (member.pinMustChange) redirect("/ganti-pin");
  return member;
}

export async function requireRole(minimum: Role): Promise<CurrentMember> {
  const member = await requireMember();
  if (!hasRole(member.role, minimum)) redirect("/");
  return member;
}
