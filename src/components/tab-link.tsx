import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "cn";

const VARIANT = {
  /** Pills on the page background. */
  plain: {
    base: "",
    active: "bg-accent text-foreground",
    idle: "text-muted-foreground hover:text-foreground",
  },
  /** Segments inside a bordered, muted track. */
  boxed: {
    base: "border",
    active: "border-border bg-card text-foreground",
    idle: "border-transparent text-muted-foreground hover:text-foreground",
  },
} as const;

/** One tab of a link-based tab bar; the active tab is marked aria-current="page". */
export function TabLink({
  active,
  variant = "plain",
  className,
  ...props
}: ComponentProps<typeof Link> & { active: boolean; variant?: keyof typeof VARIANT }) {
  const style = VARIANT[variant];
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center rounded-md px-3 text-sm font-medium",
        style.base,
        className,
        active ? style.active : style.idle,
      )}
      {...props}
    />
  );
}
