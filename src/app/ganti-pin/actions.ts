"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { DEFAULT_PIN } from "@/lib/auth/constants";
import { hashPin, PIN_PATTERN } from "@/lib/auth/pin";
import { createSession, getCurrentMember, revokeMemberSessions } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";

export type ChooseOwnPinState = { error?: string };

const schema = z
  .object({
    newPin: z.string().regex(PIN_PATTERN, "PIN harus 6–8 angka."),
    confirmPin: z.string(),
  })
  .refine((data) => data.newPin === data.confirmPin, { message: "Konfirmasi PIN tidak sama." })
  .refine((data) => data.newPin !== DEFAULT_PIN, { message: "Jangan pakai PIN awal. Pilih PIN lain." });

/** Replaces a PIN an admin gave out. The member just signed in with it, so the old PIN is not asked again. */
export async function chooseOwnPin(_previous: ChooseOwnPinState, formData: FormData): Promise<ChooseOwnPinState> {
  const member = await getCurrentMember();
  if (!member) redirect("/masuk");
  if (!member.pinMustChange) redirect("/");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({ pinHash: await hashPin(parsed.data.newPin), pinMustChange: false })
      .where(eq(members.id, member.id));
    await writeAudit({ actorId: member.id, action: "member.pin.change", subject: `member:${member.id}` }, tx);
  });

  // Anyone else who signed in with the admin's PIN is signed out.
  await revokeMemberSessions(member.id);
  await createSession(member.id);
  redirect("/");
}
