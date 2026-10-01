import { CloudOff, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { DayTabs } from "@/components/day-tabs";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SheetFreshness } from "@/components/schedule/freshness";
import { StatusLegend } from "@/components/schedule/session";
import { TimetableTable } from "@/components/schedule/timetable-table";
import { Input } from "@/components/ui/input";
import { requireMember } from "@/lib/auth/session";
import { getModeToday } from "@/lib/period/queries";
import { groupByArea } from "@/lib/rooms/group";
import { getRoomDirectory } from "@/lib/rooms/queries";
import { slotTimings } from "@/lib/schedule/slots";
import { roomKey } from "@/lib/sheets/cells";
import { getTimetable } from "@/lib/sheets/source";
import type { TimetableRoom } from "@/lib/sheets/timetable";
import { isoWeekday, timeOfDay, WEEKDAY_NAMES } from "@/lib/time";

export const metadata = { title: "Jadwal Lab" };

const BUILDINGS = [
  { value: "", label: "Semua" },
  { value: "g2", label: "Gedung 2" },
  { value: "g7", label: "Gedung 7" },
] as const;

type Filters = { day: number; building: string; q: string };

function hrefWith(filters: Filters, change: Partial<Filters>): string {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  params.set("day", String(next.day));
  if (next.building) params.set("building", next.building);
  if (next.q) params.set("q", next.q);
  return `/schedule?${params}`;
}

/** "L 7.3.2" → "L732", so "732" or "l7.3" find it. */
const compactCode = (value: string) => roomKey(value).replace(/\./g, "");

/** Matches room code (spacing and dots ignored), course, class or lecturer. */
function matches(room: TimetableRoom, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  if (compactCode(room.code).includes(compactCode(query))) return true;
  return room.sessions.some((s) =>
    [s.course, s.className, s.lecturer].some((field) => field.toLowerCase().includes(needle)),
  );
}

export default async function TimetablePage({ searchParams }: PageProps<"/schedule">) {
  await requireMember();
  const params = await searchParams;
  const { today, mode } = await getModeToday();
  const todayWeekday = isoWeekday(today);

  const requestedDay = Number(params.day);
  const filters: Filters = {
    day: requestedDay >= 1 && requestedDay <= 5 ? requestedDay : todayWeekday <= 5 ? todayWeekday : 1,
    building: params.building === "g2" || params.building === "g7" ? params.building : "",
    q: typeof params.q === "string" ? params.q.trim().slice(0, 60) : "",
  };

  const [timetable, directory] = await Promise.all([getTimetable(), getRoomDirectory()]);
  const day = timetable.data?.find((d) => d.weekday === filters.day);
  const rooms = (day?.rooms ?? []).filter((room) => matches(room, filters.q));
  const groups = groupByArea(rooms, (room) => room.code, directory).filter(
    (group) => !filters.building || group.area?.building.toLowerCase() === filters.building,
  );
  const timings = slotTimings(filters.day, todayWeekday, timeOfDay());

  return (
    <>
      <PageHeader
        title="Jadwal Lab"
        description={<SheetFreshness fetchedAt={timetable.fetchedAt} error={timetable.error} />}
      />

      {mode === "maintenance" && (
        <p className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Sedang libur semester. Jadwal ini adalah jadwal kuliah semester berjalan dan biasanya kosong.
        </p>
      )}

      <div className="mb-6 grid gap-3">
        <DayTabs selected={filters.day} today={todayWeekday} hrefFor={(day) => hrefWith(filters, { day })} />
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Pilih gedung" className="inline-flex gap-1">
            {BUILDINGS.map((building) => (
              <Link
                key={building.value}
                href={hrefWith(filters, { building: building.value })}
                aria-current={filters.building === building.value ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-md px-3 text-sm font-medium",
                  filters.building === building.value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {building.label}
              </Link>
            ))}
          </nav>
          <form action="/schedule" className="relative ml-auto w-full sm:w-72">
            <input type="hidden" name="day" value={filters.day} />
            {filters.building && <input type="hidden" name="building" value={filters.building} />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Cari ruang, matkul, dosen"
              aria-label="Cari ruang, mata kuliah, atau dosen"
              className="h-10 pl-9"
            />
          </form>
        </div>
      </div>

      {!timetable.data ? (
        <EmptyState
          icon={CloudOff}
          title="Jadwal belum bisa dimuat"
          description={timetable.error ?? "Google Sheets belum terhubung."}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Tidak ada ruang yang cocok"
          description={filters.q ? `Tidak ada hasil untuk "${filters.q}" di hari ${WEEKDAY_NAMES[filters.day]}.` : undefined}
        />
      ) : (
        <div className="grid gap-8">
          {groups.map((group) => (
            <section key={group.area?.code ?? "lainnya"} aria-labelledby={`area-${group.area?.code ?? "lainnya"}`} className="grid gap-3">
              <h2 id={`area-${group.area?.code ?? "lainnya"}`} className="text-base font-semibold">
                {group.area?.name ?? "Lainnya"}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{group.items.length} ruang</span>
              </h2>
              <TimetableTable rooms={group.items} timings={timings} />
            </section>
          ))}
          <StatusLegend />
        </div>
      )}
    </>
  );
}
