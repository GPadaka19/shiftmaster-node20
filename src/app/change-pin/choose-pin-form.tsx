"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chooseOwnPin, type ChooseOwnPinState } from "./actions";

const PIN_INPUT = {
  type: "password",
  inputMode: "numeric",
  pattern: "[0-9]*",
  minLength: 6,
  maxLength: 8,
  required: true,
  autoComplete: "new-password",
  className: "h-11",
} as const;

export function ChoosePinForm() {
  const [state, action, pending] = useActionState<ChooseOwnPinState, FormData>(chooseOwnPin, {});

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="newPin">PIN baru</Label>
        <Input id="newPin" name="newPin" autoFocus {...PIN_INPUT} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPin">Ulangi PIN baru</Label>
        <Input id="confirmPin" name="confirmPin" {...PIN_INPUT} />
      </div>

      {state.error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Menyimpan…" : "Simpan PIN"}
      </Button>
    </form>
  );
}
