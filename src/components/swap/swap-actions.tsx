"use client";

import { useState, useTransition } from "react";
import { cn } from "cn";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { decideSwapRequest } from "@/app/(app)/admin/swaps/actions";
import { answerSwap, submitSwapRequest, withdrawSwap } from "@/app/(app)/swaps/actions";
import { useFormAction } from "@/hooks/use-form-action";
import type { FormState } from "@/lib/forms";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});
  const run = (action: () => Promise<FormState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setState({});
    startTransition(async () => setState(await action()));
  };
  return { pending, state, run };
}

/** The target's answer. */
export function AnswerButtons({ requestId }: { requestId: number }) {
  const { pending, state, run } = useAction();
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Button className="h-10 px-4" disabled={pending} onClick={() => run(() => answerSwap(requestId, true))}>
          Terima
        </Button>
        <Button
          variant="outline"
          className="h-10 px-4"
          disabled={pending}
          onClick={() => run(() => answerSwap(requestId, false), "Tolak permintaan tukar shift ini?")}
        >
          Tolak
        </Button>
      </div>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

export function WithdrawButton({ requestId }: { requestId: number }) {
  const { pending, state, run } = useAction();
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        className="h-10 justify-self-start px-4"
        disabled={pending}
        onClick={() => run(() => withdrawSwap(requestId), "Batalkan permintaan ini?")}
      >
        Batalkan permintaan
      </Button>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

/** Approve (only after the target accepted) or reject with an optional note. */
export function DecideButtons({ requestId, canApprove }: { requestId: number; canApprove: boolean }) {
  const { pending, state, run } = useAction();
  const [note, setNote] = useState("");
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Catatan (opsional, terlihat oleh kedua staf)</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </label>
      <div className="flex gap-2">
        {canApprove && (
          <Button
            className="h-10 px-4"
            disabled={pending}
            onClick={() => run(() => decideSwapRequest(requestId, true, note), "Setujui? Kursi kedua staf langsung ditukar di roster.")}
          >
            Setujui
          </Button>
        )}
        <Button
          variant="destructive"
          className="h-10 px-4"
          disabled={pending}
          onClick={() => run(() => decideSwapRequest(requestId, false, note), "Tolak permintaan ini?")}
        >
          Tolak
        </Button>
      </div>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}

export type Candidate = { assignmentId: number; nickname: string; seat: string; locked: boolean };

/** Pick a colleague's seat for the chosen day, add a reason, send. */
export function SwapRequestForm({ myAssignmentId, candidates }: { myAssignmentId: number; candidates: Candidate[] }) {
  const [state, onSubmit, pending] = useFormAction(submitSwapRequest.bind(null, myAssignmentId));
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tukar dengan</legend>
        {candidates.map((candidate) => (
          <label
            key={candidate.assignmentId}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 has-[:checked]:border-foreground",
              candidate.locked && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="radio"
              name="target"
              value={candidate.assignmentId}
              disabled={candidate.locked}
              required
              className="size-4 accent-foreground"
            />
            <span className="flex-1 font-medium">{candidate.nickname}</span>
            <span className="text-sm text-muted-foreground">{candidate.locked ? "Sedang diproses" : candidate.seat}</span>
          </label>
        ))}
      </fieldset>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Alasan (opsional)</span>
        <textarea
          name="reason"
          rows={2}
          maxLength={300}
          className="rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </label>
      <FormMessage error={state.error} success={state.success} />
      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Mengirim…" : "Kirim permintaan"}
      </Button>
    </form>
  );
}
