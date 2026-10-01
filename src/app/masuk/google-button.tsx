"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithGoogle } from "./actions";

type GoogleCredentialResponse = { credential: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: "popup" | "redirect";
      }): void;
      renderButton(element: HTMLElement, options: Record<string, string | number>): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

/** Google Identity Services button. The ID token is verified on the server. */
export function GoogleButton({ clientId, next }: { clientId: string; next: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const element = container.current;
    if (!scriptReady || !window.google || !element) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      callback: ({ credential }) => {
        setError(undefined);
        startTransition(async () => {
          const result = await signInWithGoogle(credential, next);
          if (result?.error) setError(result.error);
        });
      },
    });
    window.google.accounts.id.renderButton(element, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      locale: "id",
      width: Math.min(element.offsetWidth, 400),
    });
  }, [scriptReady, clientId, next]);

  return (
    <div className="grid gap-3">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={container} className="flex min-h-11 w-full justify-center" aria-busy={pending} />
      {pending && <p className="text-center text-sm text-muted-foreground">Memeriksa akun…</p>}
      {error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
