import { ChartNoAxesColumn } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TabLink } from "@/components/tab-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITY_RANGES, ACTIVITY_RETENTION_DAYS } from "@/lib/activity/constants";
import { activityByMember, topButtons } from "@/lib/activity/queries";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { addDaysIso, formatDateTime, formatShortDate, todayIso } from "@/lib/time";

export const metadata = { title: "Aktivitas" };

type Range = (typeof ACTIVITY_RANGES)[number];

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireRole("admin");

  const requested = Number((await searchParams).range);
  const days: Range = ACTIVITY_RANGES.find((range) => range === requested) ?? ACTIVITY_RANGES[0];
  const today = todayIso();
  const since = addDaysIso(today, -(days - 1));
  const [rows, buttons] = await Promise.all([activityByMember(since), topButtons(since)]);
  const anyActivity = rows.some((row) => row.lastSeen);

  return (
    <>
      <PageHeader
        title="Aktivitas"
        description={
          <span className="tabular-nums">
            Pemakaian Shift Master, {formatShortDate(since)} – {formatShortDate(today)}.
          </span>
        }
      />

      <nav aria-label="Rentang waktu" className="mb-6 inline-flex gap-1 rounded-lg border border-border bg-muted p-0.5">
        {ACTIVITY_RANGES.map((range) => (
          <TabLink key={range} href={`/admin/activity?range=${range}`} active={range === days} variant="boxed">
            {range} hari
          </TabLink>
        ))}
      </nav>

      {!anyActivity ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title={`Belum ada aktivitas ${days} hari terakhir`}
          description="Aktivitas tercatat saat anggota masuk, membuka halaman, dan menekan tombol di aplikasi."
        />
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Anggota paling aktif</CardTitle>
              <CardDescription>
                Diurutkan dari aktivitas terbanyak. Menghitung pemakaian aplikasi, bukan jam kerja.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">Anggota</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Masuk</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Halaman</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Klik</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Hari aktif</th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">Terakhir aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {rows.map((row, index) => (
                    <tr key={row.memberId} className={row.lastSeen ? undefined : "text-muted-foreground"}>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-right text-muted-foreground">{row.lastSeen ? index + 1 : ""}</span>
                          <span className="font-medium">{row.nickname}</span>
                          {row.role !== "staff" && <Badge variant="outline">{ROLE_LABEL[row.role]}</Badge>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{row.signIns}</td>
                      <td className="px-3 py-2 text-right">{row.pageViews}</td>
                      <td className="px-3 py-2 text-right">{row.clicks}</td>
                      <td className="px-3 py-2 text-right">{row.activeDays}</td>
                      <td className="py-2 pl-3 text-right whitespace-nowrap">
                        {row.lastSeen ? formatDateTime(row.lastSeen) : "Belum pernah"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {buttons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tombol yang paling sering dipakai</CardTitle>
                <CardDescription>Nama tombol dan tautan seperti yang tertulis di layar.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[24rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-medium">Tombol</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Klik</th>
                      <th scope="col" className="py-2 pl-3 text-right font-medium">Anggota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    {buttons.map((button) => (
                      <tr key={button.label}>
                        <td className="py-2 pr-3 font-medium">{button.label}</td>
                        <td className="px-3 py-2 text-right">{button.clicks}</td>
                        <td className="py-2 pl-3 text-right">{button.members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Catatan aktivitas disimpan {ACTIVITY_RETENTION_DAYS} hari. Teks yang diketik, termasuk PIN, tidak pernah dicatat.
      </p>
    </>
  );
}
