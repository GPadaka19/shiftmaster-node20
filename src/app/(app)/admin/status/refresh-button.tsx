"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { refreshSheet } from "./actions";

export function RefreshButton({ source }: { source: "timetable" | "agenda" }) {
  const { pending, state, run } = useAction();
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        className="h-10 justify-self-start px-4"
        disabled={pending}
        onClick={() => run(() => refreshSheet(source))}
      >
        <RefreshCw className={cn(pending && "animate-spin")} aria-hidden="true" />
        {pending ? "Mengambil…" : "Ambil ulang sekarang"}
      </Button>
      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
