import { ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import type { SwapStatus } from "@/lib/swap/rules";
import { STATUS_LABEL } from "@/lib/swap/rules";
import type { SwapView } from "@/lib/swap/service";
import { formatDateTime, formatLongDate } from "@/lib/time";

const STATUS_CLASS: Record<SwapStatus, string> = {
  awaiting_target: "border-border text-foreground",
  awaiting_admin: "border-border text-foreground",
  approved: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  declined: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border text-muted-foreground",
  expired: "border-border text-muted-foreground",
};

export function SwapStatusBadge({ status }: { status: SwapStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium whitespace-nowrap", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Person({ name, seat, isYou }: { name: string; seat: string; isYou: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span className="font-medium">
        {name}
        {isYou && <span className="ml-1 text-xs font-normal text-muted-foreground">(kamu)</span>}
      </span>
      <span className="text-sm text-muted-foreground">{seat}</span>
    </div>
  );
}

/** One request: the day, who holds which seat now, and its status. Actions go in `children`. */
export function SwapCard({ swap, viewerId, children }: { swap: SwapView; viewerId: number; children?: ReactNode }) {
  return (
    <article className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{formatLongDate(swap.date)}</h3>
        <SwapStatusBadge status={swap.status} />
      </header>

      <div className="grid gap-1.5 rounded-md border border-border px-3 py-2.5">
        <Person name={swap.requester.nickname} seat={swap.requester.seat} isYou={swap.requester.id === viewerId} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpDown className="size-3.5" aria-hidden="true" />
          bertukar dengan
        </div>
        <Person name={swap.target.nickname} seat={swap.target.seat} isYou={swap.target.id === viewerId} />
      </div>

      {swap.reason && <p className="text-sm">Alasan: {swap.reason}</p>}
      {swap.note && <p className="text-sm text-muted-foreground">Catatan: {swap.note}</p>}
      <p className="text-xs text-muted-foreground">
        Diajukan {formatDateTime(swap.createdAt)}
        {swap.decidedAt && ` · diputuskan ${formatDateTime(swap.decidedAt)}`}
        {swap.decidedBy && ` oleh ${swap.decidedBy}`}
      </p>

      {children}
    </article>
  );
}
