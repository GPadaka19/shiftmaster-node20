"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePin, type ChangePinState } from "./actions";

const PIN_INPUT = {
  type: "password",
  inputMode: "numeric",
  pattern: "[0-9]*",
  minLength: 6,
  maxLength: 8,
  required: true,
  className: "h-11",
} as const;

export function ChangePinForm() {
  const [state, action, pending] = useActionState<ChangePinState, FormData>(changePin, {});

  return (
    <form action={action} className="grid max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="currentPin">PIN lama</Label>
        <Input id="currentPin" name="currentPin" autoComplete="current-password" {...PIN_INPUT} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPin">PIN baru</Label>
        <Input id="newPin" name="newPin" autoComplete="new-password" {...PIN_INPUT} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPin">Ulangi PIN baru</Label>
        <Input id="confirmPin" name="confirmPin" autoComplete="new-password" {...PIN_INPUT} />
      </div>

      {state.error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert aria-live="polite">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="h-11 justify-self-start px-4">
        {pending ? "Menyimpan…" : "Ganti PIN"}
      </Button>
    </form>
  );
}
