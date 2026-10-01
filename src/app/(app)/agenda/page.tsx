import { ClipboardList, CloudOff } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { AgendaList } from "@/components/agenda/agenda-item";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SheetFreshness } from "@/components/schedule/freshness";
import { requireMember } from "@/lib/auth/session";
import { getModeToday } from "@/lib/period/queries";
import { groupByArea } from "@/lib/rooms/group";
import { getRoomDirectory } from "@/lib/rooms/queries";
import type { AgendaEntry } from "@/lib/sheets/agenda";
import { getAgenda } from "@/lib/sheets/source";
import { addDaysIso, formatLongDate } from "@/lib/time";

export const metadata = { title: "Agenda" };

const RANGES = [2, 3, 7] as const;

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  await requireMember();
  const { today } = await getModeToday();
  const requested = Number((await searchParams).rentang);
  const days = RANGES.includes(requested as (typeof RANGES)[number]) ? requested : 3;
  const lastDay = addDaysIso(today, days - 1);

  const [agenda, directory] = await Promise.all([getAgenda(), getRoomDirectory()]);
  const entries = agenda.data ?? [];

  // Entries by date within the range; an unreadable date cannot be placed, so
  // those are listed separately rather than dropped.
  const byDate = new Map<string, AgendaEntry[]>();
  for (const entry of entries) {
    if (entry.date && entry.date >= today && entry.date <= lastDay) {
      byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
    }
  }
  const undated = entries.filter((entry) => entry.date === null);

  return (
    <>
      <PageHeader
        title="Agenda Lab"
        description={<SheetFreshness fetchedAt={agenda.fetchedAt} error={agenda.error} />}
      />

      <nav aria-label="Rentang hari" className="mb-6 inline-flex gap-1 rounded-lg border border-border bg-muted p-0.5">
        {RANGES.map((range) => (
          <Link
            key={range}
            href={`/agenda?rentang=${range}`}
            aria-current={range === days ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-md border px-3 text-sm font-medium",
              range === days ? "border-border bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {range} hari
          </Link>
        ))}
      </nav>

      {!agenda.data ? (
        <EmptyState icon={CloudOff} title="Agenda belum bisa dimuat" description={agenda.error ?? "Google Sheets belum terhubung."} />
      ) : byDate.size === 0 && undated.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`Tidak ada agenda ${days} hari ke depan`}
          description="Peminjaman lab dan jadwal maintenance dari sheet AgendaLab akan tampil di sini."
        />
      ) : (
        <div className="grid gap-8">
          {[...byDate.entries()].map(([date, dayEntries]) => (
            <section key={date} aria-labelledby={`date-${date}`} className="grid gap-4">
              <h2 id={`date-${date}`} className="text-base font-semibold">
                {formatLongDate(date)}
                {date === today && <span className="ml-2 text-sm font-normal text-brand-text">Hari ini</span>}
              </h2>
              {groupByArea(dayEntries, (entry) => entry.lab, directory, { keepOrder: true }).map((group) => (
                <div key={group.area?.code ?? "lainnya"} className="grid gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{group.area?.name ?? "Lainnya"}</h3>
                  <AgendaList entries={group.items} />
                </div>
              ))}
            </section>
          ))}
          {undated.length > 0 && (
            <section aria-labelledby="undated" className="grid gap-3">
              <h2 id="undated" className="text-base font-semibold">
                Tanggal tidak terbaca
                <span className="ml-2 text-sm font-normal text-muted-foreground">periksa penulisan tanggal di sheet</span>
              </h2>
              <AgendaList entries={undated} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
