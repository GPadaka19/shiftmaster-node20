"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import type { FormState } from "@/lib/forms";
import { cancelSwap, requestSwap, respondToSwap, SwapError } from "@/lib/swap/service";

function revalidate() {
  revalidatePath("/swaps");
  revalidatePath("/admin/swaps");
  revalidatePath("/");
}

async function run(change: () => Promise<FormState>): Promise<FormState> {
  try {
    const result = await change();
    revalidate();
    return result;
  } catch (error) {
    if (error instanceof SwapError) return { error: error.message };
    throw error;
  }
}

export async function submitSwapRequest(myAssignmentId: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const target = Number(formData.get("target"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  if (!Number.isInteger(target) || target <= 0) return { error: "Pilih rekan yang mau diajak tukar." };

  const result = await run(async () => {
    await requestSwap({ requesterId: member.id, myAssignmentId, theirAssignmentId: target, reason });
    return {};
  });
  if (result.error) return result;
  redirect("/swaps?sent=1");
}

export async function answerSwap(requestId: number, accept: boolean): Promise<FormState> {
  const member = await requireMember();
  return run(async () => {
    const { expired } = await respondToSwap({ requestId, memberId: member.id, accept });
    if (expired) return { error: `Permintaan ini tidak berlaku lagi: ${expired}` };
    return { success: accept ? "Kamu menerima. Sekarang menunggu persetujuan admin." : "Permintaan ditolak." };
  });
}

export async function withdrawSwap(requestId: number): Promise<FormState> {
  const member = await requireMember();
  return run(async () => {
    await cancelSwap({ requestId, memberId: member.id });
    return { success: "Permintaan dibatalkan." };
  });
}
