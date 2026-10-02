import { cn } from "cn";
import { SLOTS, slotLabel, type SlotTiming } from "@/lib/schedule/slots";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { SessionDetails, SlotStrip } from "./session";

/**
 * One room's day for phones: every class in full (course, class, every
 * lecturer), then the free slots on one line. The table is used from md up.
 */
export function RoomSchedule({ room, timings }: { room: TimetableRoom; timings?: SlotTiming[] }) {
  const slots = room.sessions.map((session, index) => ({ session, slot: SLOTS[index], timing: timings?.[index] ?? null }));
  const busy = slots.filter(({ session }) => session.status !== "empty");
  const free = slots.filter(({ session }) => session.status === "empty");

  return (
    <article aria-label={`Ruang ${room.code}`} className="rounded-lg border border-border bg-card">
      <header className="flex items-center gap-3 px-4 py-3">
        <h3 className="w-16 shrink-0 font-medium tabular-nums">{room.code}</h3>
        <SlotStrip sessions={room.sessions} timings={timings} className="flex-1" />
      </header>

      {busy.length === 0 ? (
        <p className="border-t border-border px-4 py-2.5 text-sm text-muted-foreground">Kosong seharian</p>
      ) : (
        <ol className="divide-y divide-border border-t border-border">
          {busy.map(({ session, slot, timing }) => (
            <li key={slot.index} className={cn("grid grid-cols-[5.25rem_1fr] gap-3 px-4 py-3", timing && "bg-brand/5")}>
              <span className="pt-px text-sm text-muted-foreground tabular-nums">{slotLabel(slot)}</span>
              <SessionDetails session={session} timing={timing} />
            </li>
          ))}
        </ol>
      )}

      {busy.length > 0 && free.length > 0 && (
        <p className="border-t border-border px-4 py-2.5 text-sm text-muted-foreground">
          Kosong:{" "}
          {free.map(({ slot }, i) => (
            <span key={slot.index} className="whitespace-nowrap tabular-nums">
              {slotLabel(slot)}
              {i < free.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
