"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { holidays, periods } from "@/lib/db/schema";
import { fieldErrorsOf, submittedValues, type FormState } from "@/lib/forms";
import { findOverlap, holidayInputSchema, periodInputSchema } from "@/lib/period/validation";
import { formatShortDate } from "@/lib/time";

/** Periods decide the mode shown everywhere, so every page re-renders. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function savePeriod(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("admin");
  const values = submittedValues(formData);
  const parsed = periodInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const id = values.id ? Number(values.id) : undefined;
  const existing = await db.select().from(periods);
  const overlap = findOverlap(existing, parsed.data, id);
  if (overlap) {
    return {
      error: `Bertabrakan dengan periode "${overlap.name}" (${formatShortDate(overlap.startDate)} – ${formatShortDate(overlap.endDate)}).`,
      values,
    };
  }

  await db.transaction(async (tx) => {
    if (id) {
      await tx.update(periods).set(parsed.data).where(eq(periods.id, id));
      await writeAudit({ actorId: actor.id, action: "period.update", subject: `period:${id}`, detail: parsed.data }, tx);
    } else {
      const [created] = await tx.insert(periods).values(parsed.data).returning({ id: periods.id });
      await writeAudit({ actorId: actor.id, action: "period.create", subject: `period:${created.id}`, detail: parsed.data }, tx);
    }
  });

  revalidateAll();
  redirect("/admin/calendar");
}

export async function deletePeriod(id: number): Promise<void> {
  const actor = await requireRole("admin");
  await db.transaction(async (tx) => {
    const [removed] = await tx.delete(periods).where(eq(periods.id, id)).returning();
    if (removed) {
      await writeAudit({ actorId: actor.id, action: "period.delete", subject: `period:${id}`, detail: removed }, tx);
    }
  });
  revalidateAll();
}

export async function saveHoliday(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("admin");
  const values = submittedValues(formData);
  const parsed = holidayInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  await db.transaction(async (tx) => {
    await tx
      .insert(holidays)
      .values(parsed.data)
      .onConflictDoUpdate({ target: holidays.date, set: { name: parsed.data.name, description: parsed.data.description } });
    await writeAudit({ actorId: actor.id, action: "holiday.save", subject: `holiday:${parsed.data.date}`, detail: parsed.data }, tx);
  });

  revalidateAll();
  return { success: `${parsed.data.name} (${formatShortDate(parsed.data.date)}) disimpan.` };
}

export async function deleteHoliday(date: string): Promise<void> {
  const actor = await requireRole("admin");
  await db.transaction(async (tx) => {
    const [removed] = await tx.delete(holidays).where(eq(holidays.date, date)).returning();
    if (removed) {
      await writeAudit({ actorId: actor.id, action: "holiday.delete", subject: `holiday:${date}`, detail: removed }, tx);
    }
  });
  revalidateAll();
}
