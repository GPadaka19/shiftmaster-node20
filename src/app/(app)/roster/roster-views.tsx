import { Clock, Sun, Sunset, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { SlotStrip } from "@/components/schedule/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AreaInfo } from "@/lib/rooms/group";
import { rosterDay, weekDutiesOf, type RosterWeek, type ShiftInfo } from "@/lib/roster/view";
import type { SlotTiming } from "@/lib/schedule/slots";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/time";

const SHIFT_ICON: Record<string, LucideIcon> = { pagi: Sun, siang: Sunset };

type Slot = { area: AreaInfo; shift: ShiftInfo };
type Holidays = Map<string, { name: string }>;

function Name({ nickname, mine }: { nickname: string; mine: boolean }) {
  return (
    <span className={cn(mine && "rounded bg-accent px-1 font-semibold text-foreground")}>
      {nickname}
      {mine && <span className="sr-only"> (kamu)</span>}
    </span>
  );
}

function ShiftLabel({ shift }: { shift: ShiftInfo }) {
  const Icon = SHIFT_ICON[shift.code] ?? Clock;
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
      <span>{shift.label}</span>
      <span className="text-xs tabular-nums">
        {shift.start}–{shift.end}
      </span>
    </span>
  );
}

/** The signed-in member's five days. */
export function MyWeek({ week, memberId, dates, holidays }: { week: RosterWeek; memberId: number; dates: string[]; holidays: Holidays }) {
  const duties = weekDutiesOf(week, memberId, dates);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Shift saya</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-5 sm:gap-3">
          {dates.map((date, i) => {
            const duty = duties[i];
            const holiday = holidays.get(date);
            return (
              <li key={date} className="flex justify-between gap-3 sm:block sm:space-y-0.5">
                <span className="font-medium sm:block">{WEEKDAY_SHORT[i + 1]}</span>
                <span className="text-right text-muted-foreground sm:block sm:text-left">
                  {holiday ? `Libur` : duty ? `${duty.shift.label} · ${duty.area.name}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** One day: a card per area with who is on each shift, and its rooms' timetable strips. */
export function RosterDayView({
  week,
  date,
  slots,
  memberId,
  roomsByArea,
  timings,
}: {
  week: RosterWeek;
  date: string;
  slots: Slot[];
  memberId: number;
  roomsByArea: Map<number, TimetableRoom[]>;
  timings?: SlotTiming[];
}) {
  const areas = rosterDay(week, date, slots).filter(
    // PKL building seats only matter in lecture weeks when someone sits in them.
    (day) => week.mode === "maintenance" || day.area.kind !== "building" || day.shifts.some((s) => s.members.length > 0),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {areas.map(({ area, shifts }) => {
        const rooms = roomsByArea.get(area.id) ?? [];
        return (
          <Card key={area.id} size="sm">
            <CardHeader>
              <CardTitle>
                {area.kind === "building" && week.mode === "lecture" ? `PKL · ${area.name}` : area.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {shifts.map(({ shift, members }) => (
                <div key={shift.id} className="grid gap-1">
                  <ShiftLabel shift={shift} />
                  <p className="flex flex-wrap gap-x-2 gap-y-0.5 pl-5.5">
                    {members.length === 0 ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : (
                      members.map((m) => <Name key={m.member.id} nickname={m.member.nickname} mine={m.member.id === memberId} />)
                    )}
                  </p>
                </div>
              ))}
              {rooms.length > 0 && (
                <ul className="grid gap-1.5 border-t border-border pt-3">
                  {rooms.map((room) => (
                    <li key={room.code} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{room.code}</span>
                      <SlotStrip sessions={room.sessions} timings={timings} className="flex-1" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Area/shift rows × weekday columns. */
export function RosterTable({
  week,
  dates,
  slots,
  memberId,
  holidays,
  today,
}: {
  week: RosterWeek;
  dates: string[];
  slots: Slot[];
  memberId: number;
  holidays: Holidays;
  today: string;
}) {
  const days = dates.map((date) => rosterDay(week, date, slots));
  const isPklArea = (area: AreaInfo) => week.mode === "lecture" && area.kind === "building";

  // Every day has the same areas and shifts in the same order, so index across days.
  const areaRows = days[0]
    .map((areaDay, areaIndex) => ({
      area: areaDay.area,
      shifts: areaDay.shifts
        .map(({ shift }, shiftIndex) => ({ shift, cells: days.map((day) => day[areaIndex].shifts[shiftIndex].members) }))
        // PKL seats only show for shifts someone actually works this week.
        .filter((row) => !isPklArea(areaDay.area) || row.cells.some((cell) => cell.length > 0)),
    }))
    .filter((areaRow) => areaRow.shifts.length > 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[48rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground">
              Area
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
              Shift
            </th>
            {dates.map((date, i) => (
              <th
                key={date}
                scope="col"
                className={cn(
                  "px-3 py-2 text-left font-medium text-muted-foreground",
                  date === today && "border-t-2 border-t-brand text-foreground",
                )}
              >
                {WEEKDAY_NAMES[i + 1]}
                {holidays.has(date) && <span className="block text-xs font-normal">Libur</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {areaRows.flatMap(({ area, shifts }) =>
            shifts.map((row, shiftIndex) => (
              <tr key={`${area.id}-${row.shift.id}`} className={cn(shiftIndex === 0 && "border-t border-border")}>
                {shiftIndex === 0 && (
                  <th
                    scope="rowgroup"
                    rowSpan={shifts.length}
                    className="sticky left-0 z-10 bg-card px-3 py-2 text-left align-top font-medium"
                  >
                    {isPklArea(area) ? `PKL · ${area.name}` : area.name}
                  </th>
                )}
                <td className="px-3 py-2 align-top whitespace-nowrap text-muted-foreground">{row.shift.label}</td>
                {row.cells.map((members, i) => (
                  <td key={i} className={cn("px-3 py-2 align-top", holidays.has(dates[i]) && "text-muted-foreground/60")}>
                    {members.length === 0 ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {members.map((m) => (
                          <Name key={m.member.id} nickname={m.member.nickname} mine={m.member.id === memberId} />
                        ))}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
