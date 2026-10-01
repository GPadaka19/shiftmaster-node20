"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { DEFAULT_PIN } from "@/lib/auth/constants";
import { hashPin, isValidPin, normalizeNickname } from "@/lib/auth/pin";
import { usesPin } from "@/lib/auth/roles";
import { requireRole, revokeMemberSessions } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { members } from "@/lib/db/schema";
import { fieldErrorsOf, type FormState } from "@/lib/forms";
import { memberInputSchema, selfChangeBlocked } from "@/lib/members/validation";

function duplicateError(error: unknown): FormState | null {
  if (isUniqueViolation(error, "members_nickname_normalized_unique")) {
    return { fieldErrors: { nickname: "Nickname ini sudah dipakai anggota lain." } };
  }
  if (isUniqueViolation(error, "members_email_unique")) {
    return { fieldErrors: { email: "Email ini sudah dipakai anggota lain." } };
  }
  return null;
}

function readMemberForm(formData: FormData) {
  return memberInputSchema.safeParse({
    nickname: formData.get("nickname"),
    fullName: formData.get("fullName"),
    email: formData.get("email") ?? "",
    role: formData.get("role"),
    pool: formData.get("pool"),
    dutyLabel: formData.get("dutyLabel") ?? "",
    startedOn: formData.get("startedOn") ?? "",
  });
}

export async function createMember(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const parsed = readMemberForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  // Staff can sign in straight away with the default PIN, then choose their own.
  const pin = usesPin(parsed.data.role) ? { pinHash: await hashPin(DEFAULT_PIN), pinMustChange: true } : {};

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(members)
        .values({ ...parsed.data, nicknameNormalized: normalizeNickname(parsed.data.nickname), ...pin })
        .returning({ id: members.id });
      await writeAudit(
        {
          actorId: actor.id,
          action: "member.create",
          subject: `member:${created.id}`,
          detail: { nickname: parsed.data.nickname, role: parsed.data.role, pool: parsed.data.pool },
        },
        tx,
      );
      return created.id;
    });
  } catch (error) {
    const duplicate = duplicateError(error);
    if (duplicate) return duplicate;
    throw error;
  }

  revalidatePath("/admin/members");
  redirect(`/admin/members/${id}?created=1`);
}

export async function updateMember(id: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const parsed = readMemberForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const blocked = selfChangeBlocked(actor.id, id, { role: parsed.data.role });
  if (blocked) return { error: blocked };

  const [before] = await db.select().from(members).where(eq(members.id, id));
  if (!before) return { error: "Anggota tidak ditemukan." };

  const changes = { ...parsed.data, nicknameNormalized: normalizeNickname(parsed.data.nickname) };
  const changed = Object.fromEntries(
    (Object.keys(parsed.data) as (keyof typeof parsed.data)[])
      .filter((key) => before[key] !== parsed.data[key])
      .map((key) => [key, { from: before[key], to: parsed.data[key] }]),
  );
  if (Object.keys(changed).length === 0) return { success: "Tidak ada perubahan." };

  try {
    await db.transaction(async (tx) => {
      await tx.update(members).set(changes).where(eq(members.id, id));
      await writeAudit({ actorId: actor.id, action: "member.update", subject: `member:${id}`, detail: changed }, tx);
    });
  } catch (error) {
    const duplicate = duplicateError(error);
    if (duplicate) return duplicate;
    throw error;
  }

  // A new role must take effect immediately, so existing sessions end.
  if ("role" in changed) await revokeMemberSessions(id);

  revalidatePath("/admin/members");
  return { success: "Perubahan disimpan." };
}

export async function setMemberActive(id: number, active: boolean): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const blocked = selfChangeBlocked(actor.id, id, { active });
  if (blocked) return { error: blocked };

  await db.transaction(async (tx) => {
    await tx.update(members).set({ active }).where(eq(members.id, id));
    await writeAudit(
      { actorId: actor.id, action: active ? "member.activate" : "member.deactivate", subject: `member:${id}` },
      tx,
    );
  });
  if (!active) await revokeMemberSessions(id);

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return { success: active ? "Anggota diaktifkan lagi." : "Anggota dinonaktifkan dan dikeluarkan dari semua perangkat." };
}

/**
 * Gives a staff member `pin`, to be replaced at their next sign-in, and unlocks
 * PIN attempts. Returns an error state, or null once done.
 */
async function assignPin(
  id: number,
  pin: string,
  actorId: number,
  auditAction: "member.pin.set" | "member.pin.reset",
): Promise<FormState | null> {
  const [member] = await db.select({ role: members.role }).from(members).where(eq(members.id, id));
  if (!member) return { error: "Anggota tidak ditemukan." };
  if (!usesPin(member.role)) return { error: "Admin masuk dengan Google, tidak memakai PIN." };

  const pinHash = await hashPin(pin);
  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({ pinHash, pinMustChange: true, failedPinAttempts: 0, pinLockedUntil: null })
      .where(eq(members.id, id));
    await writeAudit({ actorId, action: auditAction, subject: `member:${id}` }, tx);
  });
  await revokeMemberSessions(id);

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return null;
}

export async function setMemberPin(id: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const pin = String(formData.get("pin") ?? "");
  if (!isValidPin(pin)) return { fieldErrors: { pin: "PIN harus 6–8 angka." } };

  const failed = await assignPin(id, pin, actor.id, "member.pin.set");
  if (failed) return failed;
  return { success: "PIN diatur. Beri tahu anggota PIN barunya; mereka wajib menggantinya saat login. Kuncian percobaan juga sudah dibuka." };
}

/** Back to the default PIN, to be replaced at the next sign-in. For a staff member who forgot theirs. */
export async function resetMemberPin(id: number): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const failed = await assignPin(id, DEFAULT_PIN, actor.id, "member.pin.reset");
  if (failed) return failed;
  return { success: `PIN dikembalikan ke PIN awal (${DEFAULT_PIN}). Anggota wajib menggantinya saat login.` };
}
