import { cn } from "cn";

/** Two offset bars (the Pagi and Siang shifts) and a "now" dot. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6", className)}>
      <rect x="1" y="1" width="22" height="22" rx="5" className="fill-foreground" />
      <rect x="5" y="7" width="10" height="3.5" rx="1.75" className="fill-background" />
      <rect x="9" y="13.5" width="10" height="3.5" rx="1.75" className="fill-background" />
      <circle cx="18" cy="8.75" r="1.75" className="fill-brand" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <BrandMark />
      ShiftMaster
    </span>
  );
}
