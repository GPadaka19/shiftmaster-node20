"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/**
 * A button for actions that throw work away (deleting, overwriting a draft).
 * The first press asks inside the page, in place of the button; the browser's
 * own confirm dialog is not used anywhere in the app.
 */
export function ConfirmButton({
  question,
  confirmLabel,
  onConfirm,
  compact = false,
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Smaller buttons, for icon buttons in lists and table headers. */
  compact?: boolean;
  children: ReactNode;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button type="button" {...buttonProps} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  const size = compact ? "h-8 px-2.5" : "h-10 px-4";
  return (
    <div
      role="group"
      aria-label={question}
      className={cn("flex flex-wrap items-center gap-2 text-sm", !compact && "rounded-lg border border-border bg-card px-3 py-2")}
      onKeyDown={(event) => {
        if (event.key === "Escape") setAsking(false);
      }}
    >
      <span className={cn("font-medium", compact && "font-normal text-foreground")}>{question}</span>
      <Button
        type="button"
        variant={buttonProps.variant === "destructive" ? "destructive" : "default"}
        className={size}
        disabled={buttonProps.disabled}
        autoFocus
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" className={size} onClick={() => setAsking(false)}>
        Batal
      </Button>
    </div>
  );
}
