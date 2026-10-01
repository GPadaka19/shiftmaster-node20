import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addDaysIso, formatWeekRange } from "@/lib/time";

/** "28 Sep – 2 Okt 2026", marked when it is this week, for a page header's description. */
export function WeekRange({
  weekStart,
  thisWeek,
  className,
  children,
}: {
  weekStart: string;
  thisWeek: string;
  className?: string;
  /** Shown after the range, e.g. the week's mode. */
  children?: ReactNode;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2 tabular-nums", className)}>
      {formatWeekRange(weekStart)}
      {weekStart === thisWeek && <span className="text-brand-text">Minggu ini</span>}
      {children}
    </span>
  );
}

/** "Minggu ini" (when elsewhere) and previous/next week links, for a page header's actions. */
export function WeekNav({
  weekStart,
  thisWeek,
  hrefFor,
  thisWeekHref = hrefFor(thisWeek),
  className,
}: {
  weekStart: string;
  thisWeek: string;
  hrefFor: (weekStart: string) => string;
  /** Where "Minggu ini" goes, when it should differ from hrefFor(thisWeek). */
  thisWeekHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {weekStart !== thisWeek && (
        <Button asChild variant="ghost" className="h-10 px-3">
          <Link href={thisWeekHref}>Minggu ini</Link>
        </Button>
      )}
      <Button asChild variant="outline" size="icon" className="size-10">
        <Link href={hrefFor(addDaysIso(weekStart, -7))} aria-label="Minggu sebelumnya">
          <ChevronLeft aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="icon" className="size-10">
        <Link href={hrefFor(addDaysIso(weekStart, 7))} aria-label="Minggu berikutnya">
          <ChevronRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/** Draf or Terbit; `fallback` is shown when the week has no roster. */
export function WeekStatusBadge({ status, fallback = null }: { status: "draft" | "published" | null; fallback?: ReactNode }) {
  if (status === "published") return <Badge>Terbit</Badge>;
  if (status === "draft") return <Badge variant="outline">Draf</Badge>;
  return fallback;
}
