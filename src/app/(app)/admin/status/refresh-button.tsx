"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "cn";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { refreshSheet } from "./actions";

export function RefreshButton({ source }: { source: "timetable" | "agenda" }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        className="h-10 justify-self-start px-4"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await refreshSheet(source)))}
      >
        <RefreshCw className={cn(pending && "animate-spin")} aria-hidden="true" />
        {pending ? "Mengambil…" : "Ambil ulang sekarang"}
      </Button>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
