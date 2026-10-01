import { ChevronDown } from "lucide-react";
import type { SlotTiming } from "@/lib/schedule/slots";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { sessionDetail, SessionList, SlotStrip, StatusBadge, TimingBadge } from "./session";

/**
 * One room's day: code, five-slot strip, and what is on now (or next).
 * Expands to every slot.
 */
export function RoomDayCard({ room, timings }: { room: TimetableRoom; timings?: SlotTiming[] }) {
  const focusIndex = timings?.findIndex((t) => t !== null) ?? -1;
  const focus = focusIndex >= 0 ? room.sessions[focusIndex] : null;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="grid cursor-pointer list-none gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 font-medium tabular-nums">{room.code}</span>
          <SlotStrip sessions={room.sessions} timings={timings} className="flex-1" />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </div>
        {focus && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
            <TimingBadge timing={timings![focusIndex]} />
            {focus.status === "empty" ? (
              <span className="text-muted-foreground">Kosong</span>
            ) : (
              <>
                <span className="font-medium">{focus.course}</span>
                <StatusBadge status={focus.status} />
                {sessionDetail(focus) && <span className="text-muted-foreground">· {sessionDetail(focus)}</span>}
              </>
            )}
          </div>
        )}
      </summary>
      <div className="border-t border-border px-3">
        <SessionList sessions={room.sessions} timings={timings} />
      </div>
    </details>
  );
}
