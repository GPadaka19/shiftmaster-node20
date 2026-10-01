"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { DEFAULT_PIN } from "@/lib/auth/constants";
import { hashPin, PIN_PATTERN, verifyPin } from "@/lib/auth/pin";
import { usesPin } from "@/lib/auth/roles";
import { createSession, endCurrentSession, requireMember, revokeMemberSessions } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";

export async function signOut(): Promise<void> {
  await endCurrentSession();
  redirect("/login");
}

export type ChangePinState = { error?: string; success?: string };

const changePinSchema = z
  .object({
    currentPin: z.string().regex(PIN_PATTERN, "PIN lama berupa 6–8 angka."),
    newPin: z.string().regex(PIN_PATTERN, "PIN baru harus 6–8 angka."),
    confirmPin: z.string(),
  })
  .refine((data) => data.newPin === data.confirmPin, { message: "Konfirmasi PIN tidak sama." })
  .refine((data) => data.newPin !== data.currentPin, { message: "PIN baru harus berbeda dari PIN lama." })
  .refine((data) => data.newPin !== DEFAULT_PIN, { message: "Jangan pakai PIN awal. Pilih PIN lain." });

export async function changePin(_previous: ChangePinState, formData: FormData): Promise<ChangePinState> {
  const member = await requireMember();
  if (!usesPin(member.role)) return { error: "Hanya akun staf yang memakai PIN." };

  const parsed = changePinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [row] = await db.select({ pinHash: members.pinHash }).from(members).where(eq(members.id, member.id));
  if (!row?.pinHash || !(await verifyPin(parsed.data.currentPin, row.pinHash))) {
    return { error: "PIN lama salah." };
  }

  const pinHash = await hashPin(parsed.data.newPin);
  await db.transaction(async (tx) => {
    await tx.update(members).set({ pinHash }).where(eq(members.id, member.id));
    await writeAudit({ actorId: member.id, action: "member.pin.change", subject: `member:${member.id}` }, tx);
  });

  // A PIN change signs the member out everywhere else; this device stays signed in.
  await revokeMemberSessions(member.id);
  await createSession(member.id);
  return { success: "PIN berhasil diganti. Perangkat lain sudah dikeluarkan." };
}
