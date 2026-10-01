"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS } from "@/lib/auth/constants";
import { verifyGoogleCredential } from "@/lib/auth/google";
import { isPinLocked, normalizeNickname, PIN_PATTERN, registerPinFailure, verifyPin } from "@/lib/auth/pin";
import { safeNextPath } from "@/lib/auth/redirect";
import { hasRole, usesPin } from "@/lib/auth/roles";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type PinSignInState = {
  error?: string;
  /** ISO time the lockout ends, for the countdown. */
  lockedUntil?: string;
  nickname?: string;
};

const pinSignInSchema = z.object({
  nickname: z.string().trim().min(1, "Isi nickname kamu."),
  pin: z.string().regex(PIN_PATTERN, "PIN berupa 6–8 angka."),
  next: z.string().optional(),
});

function lockedState(lockedUntil: Date, nickname: string): PinSignInState {
  return {
    error: `Terlalu banyak percobaan. Coba lagi dalam ${PIN_LOCK_MINUTES} menit.`,
    lockedUntil: lockedUntil.toISOString(),
    nickname,
  };
}

export async function signInWithPin(_previous: PinSignInState, formData: FormData): Promise<PinSignInState> {
  const nickname = String(formData.get("nickname") ?? "");
  const parsed = pinSignInSchema.safeParse({
    nickname,
    pin: formData.get("pin"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, nickname };

  const [member] = await db
    .select({
      id: members.id,
      role: members.role,
      pinHash: members.pinHash,
      failedPinAttempts: members.failedPinAttempts,
      pinLockedUntil: members.pinLockedUntil,
    })
    .from(members)
    .where(and(eq(members.nicknameNormalized, normalizeNickname(parsed.data.nickname)), eq(members.active, true)))
    .limit(1);

  if (!member) return { error: "Nickname atau PIN salah.", nickname };
  if (!usesPin(member.role)) return { error: "Akun admin masuk lewat tombol Google.", nickname };
  if (!member.pinHash) return { error: "PIN kamu belum diatur. Minta admin untuk mengaturnya.", nickname };

  const now = new Date();
  if (member.pinLockedUntil && isPinLocked(member.pinLockedUntil, now)) {
    return lockedState(member.pinLockedUntil, nickname);
  }

  if (!(await verifyPin(parsed.data.pin, member.pinHash))) {
    // Row lock so two wrong tries at once cannot both read the same count.
    const state = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ failedPinAttempts: members.failedPinAttempts, pinLockedUntil: members.pinLockedUntil })
        .from(members)
        .where(eq(members.id, member.id))
        .for("update");
      if (current.pinLockedUntil && isPinLocked(current.pinLockedUntil, now)) return current;

      const next = registerPinFailure(current.failedPinAttempts, now);
      await tx.update(members).set(next).where(eq(members.id, member.id));
      return next;
    });

    if (state.pinLockedUntil) return lockedState(state.pinLockedUntil, nickname);
    const left = PIN_MAX_ATTEMPTS - state.failedPinAttempts;
    return { error: `Nickname atau PIN salah. Sisa ${left} percobaan.`, nickname };
  }

  if (member.failedPinAttempts > 0 || member.pinLockedUntil) {
    await db.update(members).set({ failedPinAttempts: 0, pinLockedUntil: null }).where(eq(members.id, member.id));
  }
  await createSession(member.id);
  redirect(safeNextPath(parsed.data.next));
}

export async function signInWithGoogle(credential: string, next?: string): Promise<{ error: string } | undefined> {
  const clientId = env().GOOGLE_CLIENT_ID;
  if (!clientId) return { error: "Login Google belum dikonfigurasi di server." };

  const identity = await verifyGoogleCredential(credential, clientId);
  if (!identity) return { error: "Verifikasi Google gagal. Coba lagi." };

  const [member] = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(and(eq(members.email, identity.email), eq(members.active, true)))
    .limit(1);

  if (!member) return { error: `${identity.email} tidak terdaftar sebagai admin.` };
  if (!hasRole(member.role, "admin")) return { error: "Akun staf masuk dengan nickname dan PIN." };

  await createSession(member.id);
  redirect(safeNextPath(next));
}
