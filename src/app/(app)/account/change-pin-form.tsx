"use client";

import { useActionState } from "react";
import { FormMessage, PinInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { changePin, type ChangePinState } from "./actions";

export function ChangePinForm() {
  const [state, action, pending] = useActionState<ChangePinState, FormData>(changePin, {});

  return (
    <form action={action} className="grid max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="currentPin">PIN lama</Label>
        <PinInput id="currentPin" name="currentPin" autoComplete="current-password" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPin">PIN baru</Label>
        <PinInput id="newPin" name="newPin" autoComplete="new-password" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPin">Ulangi PIN baru</Label>
        <PinInput id="confirmPin" name="confirmPin" autoComplete="new-password" />
      </div>

      <FormMessage error={state.error} success={state.success} />

      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Menyimpan…" : "Ganti PIN"}
      </Button>
    </form>
  );
}
