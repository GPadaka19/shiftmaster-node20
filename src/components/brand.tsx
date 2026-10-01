import Image from "next/image";
import { cn } from "cn";

/** The UPT Lab logo (from logo.png in the repo root, resized into public/brand). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-96.png"
      alt=""
      width={96}
      height={96}
      unoptimized
      priority
      className={cn("size-8 rounded-md", className)}
    />
  );
}

/**
 * The previous mark: two offset bars (the morning and afternoon shifts) and a "now"
 * dot. Kept for reference; the app uses BrandMark. Also in public/brand/logo-lama.svg.
 */
export function LegacyBrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6", className)}>
      <rect x="1" y="1" width="22" height="22" rx="5" className="fill-foreground" />
      <rect x="5" y="7" width="10" height="3.5" rx="1.75" className="fill-background" />
      <rect x="9" y="13.5" width="10" height="3.5" rx="1.75" className="fill-background" />
      <circle cx="18" cy="8.75" r="1.75" className="fill-brand" />
    </svg>
  );
}

/** Logo and name. `large` is for the sign-in pages, where the brand stands alone. */
export function Brand({ className, large = false }: { className?: string; large?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", large && "gap-3", className)}>
      <BrandMark className={large ? "size-12 rounded-lg" : undefined} />
      ShiftMaster
    </span>
  );
}
