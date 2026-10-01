"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import type { FormState } from "@/lib/forms";
import { decideSwap, SwapError } from "@/lib/swap/service";

export async function decideSwapRequest(requestId: number, approve: boolean, note: string): Promise<FormState> {
  const admin = await requireRole("admin");
  try {
    const { expired } = await decideSwap({ requestId, adminId: admin.id, approve, note: note.trim().slice(0, 300) || null });
    revalidatePath("/admin/swaps");
    revalidatePath("/swaps");
    revalidatePath("/roster");
    revalidatePath("/admin/roster");
    revalidatePath("/");
    if (expired) return { error: `Permintaan ini tidak berlaku lagi: ${expired}` };
    return { success: approve ? "Disetujui. Roster sudah diperbarui." : "Permintaan ditolak." };
  } catch (error) {
    if (error instanceof SwapError) return { error: error.message };
    throw error;
  }
}
