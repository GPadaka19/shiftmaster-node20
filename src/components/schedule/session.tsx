import { cn } from "cn";
import { SLOTS, slotLabel, type SlotTiming } from "@/lib/schedule/slots";
import type { Session, SessionStatus } from "@/lib/sheets/timetable";

export const STATUS_LABEL: Record<SessionStatus, string> = {
  planned: "Terisi",
  empty: "Kosong",
  booked: "Booked",
  conflict: "Bentrok",
};

/** Segment fill per status. Text always accompanies color somewhere nearby. */
const STRIP_CLASS: Record<SessionStatus, string> = {
  planned: "bg-foreground/75",
  empty: "bg-foreground/10",
  booked: "bg-info",
  conflict: "bg-destructive",
};

export const TIMING_LABEL: Record<Exclude<SlotTiming, null>, string> = {
  now: "Sekarang",
  incoming: "Segera",
};

/** Five segments, one per slot. The running or next slot gets a brand ring. */
export function SlotStrip({ sessions, timings, className }: { sessions: Session[]; timings?: SlotTiming[]; className?: string }) {
  const summary = sessions.map((s, i) => `${SLOTS[i].start} ${STATUS_LABEL[s.status]}`).join(", ");
  return (
    <div role="img" aria-label={summary} className={cn("flex gap-1", className)}>
      {sessions.map((session, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 flex-1 rounded-sm",
            STRIP_CLASS[session.status],
            timings?.[i] && "ring-2 ring-brand ring-offset-1 ring-offset-card",
          )}
        />
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === "planned") return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-xs font-medium",
        status === "empty" && "bg-muted text-muted-foreground",
        status === "booked" && "bg-info/10 text-info",
        status === "conflict" && "bg-destructive/10 text-destructive",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TimingBadge({ timing }: { timing: SlotTiming }) {
  if (!timing) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-xs font-medium",
        timing === "now" ? "bg-brand text-brand-foreground" : "border border-brand/50 text-brand-text",
      )}
    >
      {TIMING_LABEL[timing]}
    </span>
  );
}

/** Everything the sheet says about one class, nothing cut off: course, class, every lecturer. */
export function SessionDetails({ session, timing = null }: { session: Session; timing?: SlotTiming }) {
  return (
    <div className="min-w-0 space-y-1 break-words">
      <div className="flex flex-wrap items-center gap-1.5">
        {session.course ? (
          <span className="text-sm font-medium">{session.course}</span>
        ) : (
          session.status === "empty" && <span className="text-sm text-muted-foreground">Kosong</span>
        )}
        {session.status !== "empty" && <StatusBadge status={session.status} />}
        <TimingBadge timing={timing} />
      </div>
      {session.className && <p className="text-sm text-muted-foreground">{session.className}</p>}
      {session.lecturer && <p className="text-sm text-muted-foreground">{session.lecturer}</p>}
    </div>
  );
}

/** The day's five slots for one room, as rows. */
export function SessionList({ sessions, timings }: { sessions: Session[]; timings?: SlotTiming[] }) {
  return (
    <ol className="divide-y divide-border">
      {sessions.map((session, i) => (
        <li key={i} className={cn("grid grid-cols-[5.25rem_1fr] gap-3 py-2.5 sm:grid-cols-[6.5rem_1fr]", timings?.[i] && "bg-brand/5")}>
          <span className="pl-1 text-sm text-muted-foreground tabular-nums">{slotLabel(SLOTS[i])}</span>
          <SessionDetails session={session} timing={timings?.[i] ?? null} />
        </li>
      ))}
    </ol>
  );
}

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(STATUS_LABEL) as SessionStatus[]).map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", STRIP_CLASS[status])} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-foreground/10 ring-2 ring-brand ring-offset-1 ring-offset-background" aria-hidden="true" />
        Sekarang / segera
      </li>
    </ul>
  );
}
