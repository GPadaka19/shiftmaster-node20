import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "@/lib/auth/constants";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Styled like Input, but native so phones show their own picker. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/** A PIN field that brings up the number pad on phones. */
export function PinInput({
  className,
  ...props
}: Pick<ComponentProps<"input">, "id" | "name" | "autoComplete" | "autoFocus" | "className">) {
  return (
    <Input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      minLength={PIN_MIN_LENGTH}
      maxLength={PIN_MAX_LENGTH}
      required
      className={cn("h-11", className)}
      {...props}
    />
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <Alert variant="destructive" aria-live="polite">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (success) {
    return (
      <Alert aria-live="polite">
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
