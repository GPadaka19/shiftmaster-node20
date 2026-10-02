import { asc, desc, gte } from "drizzle-orm";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { ModeBadge } from "@/components/mode-badge";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { holidays, periods } from "@/lib/db/schema";
import { getModeToday } from "@/lib/period/queries";
import { formatLongDate, formatShortDate } from "@/lib/time";
import { deleteHoliday, deletePeriod } from "./actions";
import { DeleteButton, HolidayForm, PeriodForm } from "./calendar-forms";

export const metadata = { title: "Kalender" };

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  await requireRole("admin");
  const { today } = await getModeToday();
  const editId = Number((await searchParams).period) || undefined;

  const [allPeriods, upcomingHolidays] = await Promise.all([
    db.select().from(periods).orderBy(desc(periods.startDate)),
    db.select().from(holidays).where(gte(holidays.date, today)).orderBy(asc(holidays.date)),
  ]);
  const editing = allPeriods.find((p) => p.id === editId);

  return (
    <>
      <PageHeader title="Kalender" description="Periode menentukan mode aplikasi; hari libur meniadakan shift." />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Periode</CardTitle>
            <CardDescription>
              Aplikasi memakai mode dari periode yang mencakup hari ini. Periode tidak boleh saling tumpang tindih.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {allPeriods.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {allPeriods.map((period) => {
                  const status =
                    period.startDate <= today && today <= period.endDate
                      ? "Berjalan"
                      : period.startDate > today
                        ? "Akan datang"
                        : "Selesai";
                  return (
                    <li key={period.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{period.name}</p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {formatShortDate(period.startDate)} – {formatShortDate(period.endDate)}
                        </p>
                      </div>
                      <ModeBadge mode={period.mode} />
                      <Badge variant={status === "Berjalan" ? "default" : "outline"}>{status}</Badge>
                      <div className="flex">
                        <Button asChild variant="ghost" size="icon" className="size-10 text-muted-foreground" title="Ubah">
                          <Link href={`/admin/calendar?period=${period.id}`} aria-label={`Ubah ${period.name}`}>
                            <Pencil aria-hidden="true" />
                          </Link>
                        </Button>
                        <DeleteButton
                          label={`Hapus ${period.name}`}
                          onDelete={deletePeriod.bind(null, period.id)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="grid gap-3">
              <h3 className="text-sm font-medium">{editing ? `Ubah "${editing.name}"` : "Tambah periode"}</h3>
              <PeriodForm key={editing?.id ?? "new"} defaults={editing} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hari libur</CardTitle>
            <CardDescription>Di hari libur, Hari Ini menampilkan nama liburnya dan tidak ada shift.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {upcomingHolidays.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {upcomingHolidays.map((holiday) => (
                  <li key={holiday.date} className="flex items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatLongDate(holiday.date)}
                        {holiday.description && ` · ${holiday.description}`}
                      </p>
                    </div>
                    <DeleteButton
                      label={`Hapus ${holiday.name}`}
                      onDelete={deleteHoliday.bind(null, holiday.date)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada hari libur mendatang.</p>
            )}
            <div className="grid gap-3">
              <h3 className="text-sm font-medium">Tambah hari libur</h3>
              <HolidayForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
