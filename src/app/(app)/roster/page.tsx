import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { DayTabs } from "@/components/day-tabs";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth/session";
import { getHolidays, getModeToday } from "@/lib/period/queries";
import { roomKeysForArea } from "@/lib/rooms/group";
import { getRoomDirectory } from "@/lib/rooms/queries";
import { getPublishedRosterWeek, getRosterSlots } from "@/lib/roster/queries";
import { slotTimings } from "@/lib/schedule/slots";
import { roomKey } from "@/lib/sheets/cells";
import { getTimetable } from "@/lib/sheets/source";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { addDaysIso, formatLongDate, formatWeekRange, isMondayIso, isoWeekday, timeOfDay, weekStartIso } from "@/lib/time";
import { MyWeek, RosterDayView, RosterTable } from "./roster-views";

export const metadata = { title: "Roster" };

type View = "day" | "table";
type Query = { week: string; view: View; day: number };

function hrefWith(query: Query, change: Partial<Query>): string {
  const next = { ...query, ...change };
  const params = new URLSearchParams({ week: next.week });
  if (next.view === "table") params.set("view", "table");
  else params.set("day", String(next.day));
  return `/roster?${params}`;
}

export default async function RosterPage({ searchParams }: PageProps<"/roster">) {
  const member = await requireMember();
  const params = await searchParams;
  const { today } = await getModeToday();
  const thisWeek = weekStartIso(today);
  const todayWeekday = isoWeekday(today);

  const weekStart = isMondayIso(params.week) ? params.week : thisWeek;
  const requestedDay = Number(params.day);
  const query: Query = {
    week: weekStart,
    view: params.view === "table" ? "table" : "day",
    day:
      requestedDay >= 1 && requestedDay <= 5 ? requestedDay : weekStart === thisWeek && todayWeekday <= 5 ? todayWeekday : 1,
  };
  const dates = [0, 1, 2, 3, 4].map((offset) => addDaysIso(weekStart, offset));
  const date = dates[query.day - 1];

  const [week, holidays] = await Promise.all([getPublishedRosterWeek(weekStart), getHolidays(dates[0], dates[4])]);

  const header = (
    <PageHeader
      title="Roster"
      description={
        <span className="tabular-nums">
          {formatWeekRange(weekStart)}
          {weekStart === thisWeek && <span className="ml-2 text-brand-text">Minggu ini</span>}
        </span>
      }
      actions={
        <div className="flex items-center gap-1">
          {weekStart !== thisWeek && (
            <Button asChild variant="ghost" className="h-10 px-3">
              <Link href={hrefWith(query, { week: thisWeek, day: todayWeekday <= 5 ? todayWeekday : 1 })}>Minggu ini</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="icon" className="size-10">
            <Link href={hrefWith(query, { week: addDaysIso(weekStart, -7) })} aria-label="Minggu sebelumnya">
              <ChevronLeft aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-10">
            <Link href={hrefWith(query, { week: addDaysIso(weekStart, 7) })} aria-label="Minggu berikutnya">
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      }
    />
  );

  if (!week) {
    return (
      <>
        {header}
        <EmptyState
          icon={CalendarOff}
          title="Belum ada roster yang terbit"
          description="Roster minggu ini akan tampil di sini setelah admin menerbitkannya."
        />
      </>
    );
  }

  const slots = await getRosterSlots(week.mode);
  const inRoster = week.assignments.some((a) => a.member.id === member.id);

  // Timetable strips for each area in the day view (lecture weeks only).
  const roomsByArea = new Map<number, TimetableRoom[]>();
  if (week.mode === "lecture" && query.view === "day") {
    const [timetable, directory] = await Promise.all([getTimetable(), getRoomDirectory()]);
    const dayRooms = timetable.data?.find((d) => d.weekday === query.day)?.rooms ?? [];
    for (const { area } of slots) {
      if (area.kind === "building" || roomsByArea.has(area.id)) continue;
      const keys = roomKeysForArea(area, directory);
      roomsByArea.set(
        area.id,
        dayRooms
          .filter((room) => keys.has(roomKey(room.code)))
          .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true })),
      );
    }
  }

  const holiday = holidays.get(date);

  return (
    <>
      {header}
      <div className="grid gap-6">
        {inRoster && <MyWeek week={week} memberId={member.id} dates={dates} holidays={holidays} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {query.view === "day" ? (
            <DayTabs
              selected={query.day}
              today={weekStart === thisWeek ? todayWeekday : 0}
              hrefFor={(day) => hrefWith(query, { day })}
              muted={dates.flatMap((d, i) => (holidays.has(d) ? [i + 1] : []))}
            />
          ) : (
            <span />
          )}
          <nav aria-label="Tampilan" className="inline-flex gap-1">
            {(["day", "table"] as const).map((view) => (
              <Link
                key={view}
                href={hrefWith(query, { view })}
                aria-current={query.view === view ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-md px-3 text-sm font-medium",
                  query.view === view ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {view === "day" ? "Per hari" : "Tabel"}
              </Link>
            ))}
          </nav>
        </div>

        {query.view === "table" ? (
          <RosterTable week={week} dates={dates} slots={slots} memberId={member.id} holidays={holidays} today={today} />
        ) : (
          <section aria-label={formatLongDate(date)} className="grid gap-3">
            {holiday && (
              <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <span className="font-medium">Libur: {holiday.name}.</span>{" "}
                <span className="text-muted-foreground">Roster hari ini tidak berlaku.</span>
              </p>
            )}
            <RosterDayView
              week={week}
              date={date}
              slots={slots}
              memberId={member.id}
              roomsByArea={roomsByArea}
              timings={date === today ? slotTimings(query.day, todayWeekday, timeOfDay()) : undefined}
            />
          </section>
        )}
      </div>
    </>
  );
}
