import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getModeToday } from "@/lib/period/queries";
import { getRoomDirectory } from "@/lib/rooms/queries";
import { getWeekRecord } from "@/lib/roster/service";
import { roomKey } from "@/lib/sheets/cells";
import { getAgenda, getTimetable } from "@/lib/sheets/source";
import { addDaysIso, formatDateTime, formatWeekRange, weekStartIso } from "@/lib/time";
import { RefreshButton } from "./refresh-button";

export const metadata = { title: "Status" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function StatusPage() {
  await requireRole("admin");
  const config = env();
  const configured = Boolean(
    config.GOOGLE_SHEETS_CLIENT_ID && config.GOOGLE_SHEETS_CLIENT_SECRET && config.GOOGLE_SHEETS_REFRESH_TOKEN,
  );

  const { today } = await getModeToday();
  const thisWeek = weekStartIso(today);
  const nextWeek = addDaysIso(thisWeek, 7);
  const [timetable, agenda, directory, current, upcoming] = await Promise.all([
    getTimetable(),
    getAgenda(),
    getRoomDirectory(),
    getWeekRecord(thisWeek),
    getWeekRecord(nextWeek),
  ]);

  const unknownRooms = new Set<string>();
  for (const day of timetable.data ?? []) {
    for (const room of day.rooms) if (!directory.has(roomKey(room.code))) unknownRooms.add(room.code);
  }
  for (const entry of agenda.data ?? []) {
    if (entry.lab && !directory.has(roomKey(entry.lab))) unknownRooms.add(entry.lab);
  }

  const sources = [
    {
      key: "timetable" as const,
      title: "Jadwal kuliah",
      result: timetable,
      summary: timetable.data ? `${timetable.data.reduce((n, d) => n + d.rooms.length, 0)} baris ruang dalam 5 hari` : null,
    },
    {
      key: "agenda" as const,
      title: "Agenda lab",
      result: agenda,
      summary: agenda.data ? `${agenda.data.length} entri` : null,
    },
  ];

  const weekStatus = (week: Awaited<ReturnType<typeof getWeekRecord>>) =>
    !week ? <Badge variant="outline">Belum ada</Badge> : week.status === "published" ? <Badge>Terbit</Badge> : <Badge variant="outline">Draf</Badge>;

  return (
    <>
      <PageHeader title="Status" description="Kondisi data dari Google Sheets dan roster." />
      <div className="grid gap-4">
        {!configured && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            Kredensial Google Sheets belum diisi. Lihat <code className="font-mono">docs/google-sheets-credentials.md</code>.
          </p>
        )}

        {sources.map(({ key, title, result, summary }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.error ? (
                  <CircleAlert className="size-4 text-destructive" aria-label="Bermasalah" />
                ) : (
                  <CheckCircle2 className="size-4 text-success" aria-label="Baik" />
                )}
                {title}
              </CardTitle>
              <CardDescription>Diambil otomatis paling lama 15 menit sekali.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <dl className="grid gap-2 text-sm">
                <Row label="Terakhir berhasil">{result.fetchedAt ? formatDateTime(result.fetchedAt) : "Belum pernah"}</Row>
                {summary && <Row label="Isi">{summary}</Row>}
                {result.error && (
                  <Row label="Error terakhir">
                    <span className="text-destructive">{result.error}</span>
                  </Row>
                )}
              </dl>
              <RefreshButton source={key} />
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Kode ruangan tidak dikenal</CardTitle>
            <CardDescription>Ruangan dari Sheets yang belum ada di daftar ruangan. Di jadwal dan agenda, ruangan ini muncul di grup “Lainnya”.</CardDescription>
          </CardHeader>
          <CardContent>
            {unknownRooms.size === 0 ? (
              <p className="text-sm text-muted-foreground">Semua kode ruangan dikenali.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {[...unknownRooms].sort().map((code) => (
                  <li key={code}>
                    <Badge variant="outline" className="tabular-nums">
                      {code}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roster</CardTitle>
            <CardDescription>
              Roster minggu depan dibuat otomatis tiap Jumat sore kalau belum ada (cron <code className="font-mono">/api/cron/weekly-roster</code>).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <Row label={`Minggu ini (${formatWeekRange(thisWeek)})`}>
                <Link href={`/admin/roster?minggu=${thisWeek}`}>{weekStatus(current)}</Link>
              </Row>
              <Row label={`Minggu depan (${formatWeekRange(nextWeek)})`}>
                <Link href={`/admin/roster?minggu=${nextWeek}`}>{weekStatus(upcoming)}</Link>
              </Row>
              <Row label="Cron">{config.CRON_SECRET ? "Dikonfigurasi" : "CRON_SECRET belum diisi"}</Row>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
