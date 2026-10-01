"use client";

import { useActionState } from "react";
import { FormMessage, PinInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { chooseOwnPin, type ChooseOwnPinState } from "./actions";

export function ChoosePinForm() {
  const [state, action, pending] = useActionState<ChooseOwnPinState, FormData>(chooseOwnPin, {});

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="newPin">PIN baru</Label>
        <PinInput id="newPin" name="newPin" autoComplete="new-password" autoFocus />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPin">Ulangi PIN baru</Label>
        <PinInput id="confirmPin" name="confirmPin" autoComplete="new-password" />
      </div>

      <FormMessage error={state.error} />

      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Menyimpan…" : "Simpan PIN"}
      </Button>
    </form>
  );
}
