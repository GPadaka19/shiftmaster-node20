"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { hashPin, isValidPin, normalizeNickname } from "@/lib/auth/pin";
import { requireRole, revokeMemberSessions } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { fieldErrorsOf, submittedValues, type FormState } from "@/lib/forms";
import { memberInputSchema, selfChangeBlocked } from "@/lib/members/validation";

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } })?.cause ?? error;
  const pg = cause as { code?: string; constraint_name?: string };
  return pg.code === "23505" && pg.constraint_name === constraint;
}

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
  });
}

export async function createMember(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const parsed = readMemberForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: submittedValues(formData) };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(members)
        .values({ ...parsed.data, nicknameNormalized: normalizeNickname(parsed.data.nickname) })
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
    if (duplicate) return { ...duplicate, values: submittedValues(formData) };
    throw error;
  }

  revalidatePath("/admin/anggota");
  redirect(`/admin/anggota/${id}?baru=1`);
}

export async function updateMember(id: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const parsed = readMemberForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: submittedValues(formData) };

  const blocked = selfChangeBlocked(actor.id, id, { role: parsed.data.role });
  if (blocked) return { error: blocked, values: submittedValues(formData) };

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
    if (duplicate) return { ...duplicate, values: submittedValues(formData) };
    throw error;
  }

  // A new role must take effect immediately, so existing sessions end.
  if ("role" in changed) await revokeMemberSessions(id);

  revalidatePath("/admin/anggota");
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

  revalidatePath("/admin/anggota");
  revalidatePath(`/admin/anggota/${id}`);
  return { success: active ? "Anggota diaktifkan lagi." : "Anggota dinonaktifkan dan dikeluarkan dari semua perangkat." };
}

export async function setMemberPin(id: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("superadmin");
  const pin = String(formData.get("pin") ?? "");
  if (!isValidPin(pin)) return { fieldErrors: { pin: "PIN harus 4–8 angka." } };

  const [member] = await db.select({ role: members.role }).from(members).where(eq(members.id, id));
  if (!member) return { error: "Anggota tidak ditemukan." };
  if (member.role !== "staff") return { error: "Admin masuk dengan Google, tidak memakai PIN." };

  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({ pinHash: await hashPin(pin), failedPinAttempts: 0, pinLockedUntil: null })
      .where(eq(members.id, id));
    await writeAudit({ actorId: actor.id, action: "member.pin.set", subject: `member:${id}` }, tx);
  });
  await revokeMemberSessions(id);

  revalidatePath("/admin/anggota");
  revalidatePath(`/admin/anggota/${id}`);
  return { success: "PIN diatur. Beri tahu anggota PIN barunya; kuncian percobaan juga sudah dibuka." };
}
