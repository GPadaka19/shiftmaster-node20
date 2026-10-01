"use server";

import { requireRole } from "@/lib/auth/session";
import type { FormState } from "@/lib/forms";
import { revalidateSwapViews } from "@/lib/swap/revalidate";
import { SWAP_TEXT_MAX_LENGTH } from "@/lib/swap/rules";
import { decideSwap, SwapError } from "@/lib/swap/service";

export async function decideSwapRequest(requestId: number, approve: boolean, note: string): Promise<FormState> {
  const admin = await requireRole("admin");
  try {
    const { expired } = await decideSwap({ requestId, adminId: admin.id, approve, note: note.trim().slice(0, SWAP_TEXT_MAX_LENGTH) || null });
    revalidateSwapViews({ roster: true });
    if (expired) return { error: `Permintaan ini tidak berlaku lagi: ${expired}` };
    return { success: approve ? "Disetujui. Roster sudah diperbarui." : "Permintaan ditolak." };
  } catch (error) {
    if (error instanceof SwapError) return { error: error.message };
    throw error;
  }
}
