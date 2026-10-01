"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import type { FormState } from "@/lib/forms";
import { refreshNow } from "@/lib/sheets/source";

export async function refreshSheet(source: "timetable" | "agenda"): Promise<FormState> {
  const actor = await requireRole("admin");
  const result = await refreshNow(source);
  await writeAudit({ actorId: actor.id, action: "sheets.refresh", subject: `sheet:${source}`, detail: { ok: !result.error } });
  revalidatePath("/", "layout");
  return result.error ? { error: result.error } : { success: "Data terbaru sudah diambil dari Google Sheets." };
}
