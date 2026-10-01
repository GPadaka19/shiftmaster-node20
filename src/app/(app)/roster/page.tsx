import { CalendarOff } from "lucide-react";
import { DayTabs } from "@/components/day-tabs";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TabLink } from "@/components/tab-link";
import { WeekNav, WeekRange } from "@/components/week-nav";
import { requireMember } from "@/lib/auth/session";
import { getHolidays, getModeToday } from "@/lib/period/queries";
import { roomKeysForArea } from "@/lib/rooms/group";
import { getRoomDirectory } from "@/lib/rooms/queries";
import { getPublishedRosterWeek, getRosterSlots } from "@/lib/roster/queries";
import { slotTimings } from "@/lib/schedule/slots";
import { roomKey } from "@/lib/sheets/cells";
import { getTimetable } from "@/lib/sheets/source";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { clampWeekday, formatLongDate, isMondayIso, isoWeekday, timeOfDay, weekDates, weekStartIso } from "@/lib/time";
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
  const defaultDay = todayWeekday <= 5 ? todayWeekday : 1;

  const weekStart = isMondayIso(params.week) ? params.week : thisWeek;
  const query: Query = {
    week: weekStart,
    view: params.view === "table" ? "table" : "day",
    day: clampWeekday(params.day, weekStart === thisWeek ? defaultDay : 1),
  };
  const dates = weekDates(weekStart);
  const date = dates[query.day - 1];

  const [week, holidays] = await Promise.all([getPublishedRosterWeek(weekStart), getHolidays(dates[0], dates[4])]);

  const header = (
    <PageHeader
      title="Roster"
      description={<WeekRange weekStart={weekStart} thisWeek={thisWeek} />}
      actions={
        <WeekNav
          weekStart={weekStart}
          thisWeek={thisWeek}
          hrefFor={(week) => hrefWith(query, { week })}
          thisWeekHref={hrefWith(query, { week: thisWeek, day: defaultDay })}
        />
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
              <TabLink key={view} href={hrefWith(query, { view })} active={query.view === view}>
                {view === "day" ? "Per hari" : "Tabel"}
              </TabLink>
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
