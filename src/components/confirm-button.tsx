"use client";

import { AlertDialog } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A button that asks before running its action, in a dialog styled like the
 * rest of the app. The browser's own confirm box is not used anywhere.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, "onClick" | "title"> & {
  /** The question, e.g. "Terbitkan roster ini?" */
  title: string;
  /** What happens next, e.g. "Staf akan langsung melihatnya." */
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button type="button" {...buttonProps}>
          {children}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <AlertDialog.Content
          // Without a description there is nothing to point at.
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-lg duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none"
        >
          <div className="grid gap-1.5">
            <AlertDialog.Title className="text-base font-semibold tracking-tight">{title}</AlertDialog.Title>
            {description && (
              <AlertDialog.Description className="text-sm text-muted-foreground">{description}</AlertDialog.Description>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" className="h-11 px-4 sm:h-10">
                Batal
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                type="button"
                variant={destructive ? "destructive" : "default"}
                className="h-11 px-4 sm:h-10"
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
