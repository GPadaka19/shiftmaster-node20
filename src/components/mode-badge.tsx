import { BookOpen, Wrench } from "lucide-react";
import { cn } from "cn";
import { MODE_LABEL, type Mode } from "@/lib/period/resolve";

export function ModeBadge({ mode, className }: { mode: Mode; className?: string }) {
  const Icon = mode === "lecture" ? BookOpen : Wrench;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      {MODE_LABEL[mode]}
    </span>
  );
}
