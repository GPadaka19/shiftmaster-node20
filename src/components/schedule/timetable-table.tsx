import { cn } from "cn";
import { SLOTS, slotLabel, type SlotTiming } from "@/lib/schedule/slots";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { STATUS_LABEL, TIMING_LABEL } from "./session";

/** Rooms × five slots, for tablets and up (phones get RoomSchedule cards). Nothing is cut off. */
export function TimetableTable({ rooms, timings }: { rooms: TimetableRoom[]; timings?: SlotTiming[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="sticky left-0 z-10 w-24 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
              Ruang
            </th>
            {SLOTS.map((slot, i) => (
              <th
                key={slot.index}
                scope="col"
                className={cn(
                  "px-3 py-2 text-left font-medium text-muted-foreground tabular-nums",
                  timings?.[i] && "border-t-2 border-t-brand text-foreground",
                )}
              >
                {slotLabel(slot)}
                {timings?.[i] && <span className="ml-1.5 text-xs text-brand-text">{TIMING_LABEL[timings[i]!]}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rooms.map((room) => (
            <tr key={room.code}>
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left align-top font-medium whitespace-nowrap tabular-nums">
                {room.code}
              </th>
              {room.sessions.map((session, i) => (
                <td key={i} className={cn("w-1/5 px-3 py-2.5 align-top", timings?.[i] && "bg-brand/5")}>
                  {session.status === "empty" ? (
                    <span className="text-muted-foreground/60">—</span>
                  ) : (
                    <div className="space-y-0.5 break-words">
                      <p
                        className={cn(
                          "font-medium",
                          session.status === "booked" && "text-info",
                          session.status === "conflict" && "text-destructive",
                        )}
                      >
                        {session.course}
                        {session.status !== "planned" && (
                          <span className="ml-1 text-xs font-normal">({STATUS_LABEL[session.status]})</span>
                        )}
                      </p>
                      {session.className && <p className="text-xs text-muted-foreground">{session.className}</p>}
                      {session.lecturer && <p className="text-xs text-muted-foreground">{session.lecturer}</p>}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
