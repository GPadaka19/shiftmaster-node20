"use client";

import { useActionState, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPin, type PinSignInState } from "./actions";

export function PinForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<PinSignInState, FormData>(signInWithPin, {});
  const [nickname, setNickname] = useState("");
  const locked = useLockCountdown(state.lockedUntil);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-2">
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          name="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          autoComplete="current-password"
          required
          className="h-11 tracking-widest"
        />
      </div>

      {state.error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>
            {locked ? `Terlalu banyak percobaan. Coba lagi dalam ${locked}.` : state.error}
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending || Boolean(locked)} className="h-11 text-base">
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}

/** "14:32" until `lockedUntil`, then null. */
function useLockCountdown(lockedUntil: string | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  if (!lockedUntil) return null;
  const seconds = Math.ceil((new Date(lockedUntil).getTime() - now) / 1000);
  if (seconds <= 0) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
