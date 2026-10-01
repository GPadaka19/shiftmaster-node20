import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { ModeBadge } from "@/components/mode-badge";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeekNav, WeekRange, WeekStatusBadge } from "@/components/week-nav";
import { requireRole } from "@/lib/auth/session";
import { getHolidays, getModeOn, getModeToday } from "@/lib/period/queries";
import type { Mode } from "@/lib/period/resolve";
import { distribution } from "@/lib/roster/distribution";
import { getEditorAssignments, getWeekRecord, previousRosterWeek, seatsFor } from "@/lib/roster/service";
import { validateRoster, type CheckedMember, type Violation } from "@/lib/roster/validate";
import { loadWeekRules } from "@/lib/roster/week-rules";
import { formatDateTime, formatWeekRange, isMondayIso, weekDates, weekStartIso } from "@/lib/time";
import { RosterEditor, type EditorRow, type EditorSeat } from "./roster-editor";
import { WeekActions } from "./week-actions";

export const metadata = { title: "Editor Roster" };

export default async function RosterEditorPage({ searchParams }: PageProps<"/admin/roster">) {
  await requireRole("admin");
  const params = await searchParams;
  const { today } = await getModeToday();
  const thisWeek = weekStartIso(today);
  const weekStart = isMondayIso(params.week) ? params.week : thisWeek;
  const dates = weekDates(weekStart);

  const [week, holidays, previous] = await Promise.all([
    getWeekRecord(weekStart),
    getHolidays(dates[0], dates[4]),
    previousRosterWeek(weekStart),
  ]);
  const mode = week?.mode ?? (await getModeOn(weekStart)).mode;
  const seats = await seatsFor(mode);

  const status = week ? week.status : "none";

  return (
    <>
      <PageHeader
        title="Editor Roster"
        description={
          <WeekRange weekStart={weekStart} thisWeek={thisWeek}>
            <ModeBadge mode={mode} />
          </WeekRange>
        }
        actions={<WeekNav weekStart={weekStart} thisWeek={thisWeek} hrefFor={(week) => `/admin/roster?week=${week}`} />}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Status
              <WeekStatusBadge status={week?.status ?? null} />
            </CardTitle>
            <CardDescription>
              {status === "none" && "Belum ada roster untuk minggu ini."}
              {status === "draft" && "Draf hanya terlihat oleh admin sampai diterbitkan."}
              {status === "published" &&
                `Terlihat oleh staf sejak ${formatDateTime(week!.publishedAt!)}. Perubahan di bawah langsung berlaku.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekActions
              weekStart={weekStart}
              status={status}
              mode={mode}
              previousWeek={previous ? { weekStart: previous, label: formatWeekRange(previous) } : null}
            />
          </CardContent>
        </Card>

        {week && (
          <EditorSection
            weekId={week.id}
            weekStart={weekStart}
            mode={mode}
            dates={dates}
            seats={seats}
            holidays={Object.fromEntries([...holidays].map(([date, holiday]) => [date, holiday.name]))}
          />
        )}
      </div>
    </>
  );
}

async function EditorSection({
  weekId,
  weekStart,
  mode,
  dates,
  seats,
  holidays,
}: {
  weekId: number;
  weekStart: string;
  mode: Mode;
  dates: string[];
  seats: Awaited<ReturnType<typeof seatsFor>>;
  holidays: Record<string, string>;
}) {
  const [rows, { members: team, locks }] = await Promise.all([getEditorAssignments(weekId), loadWeekRules(weekStart, "active")]);

  const editorRows: EditorRow[] = seats.map((seat) => ({
    areaId: seat.area.id,
    areaName: seat.area.name,
    areaKind: seat.area.kind,
    shiftId: seat.shift.id,
    shiftLabel: seat.shift.label,
    capacity: seat.capacity,
  }));

  const cells: Record<string, EditorSeat[]> = {};
  const dutyLabels: Record<string, Record<number, string>> = {};
  for (const row of rows) {
    const key = `${row.date}|${row.areaId}|${row.shiftId}`;
    (cells[key] ??= []).push({ id: row.id, memberId: row.memberId, nickname: row.nickname, inactive: !row.active });
    (dutyLabels[row.date] ??= {})[row.memberId] = `${row.area.name} ${row.shiftLabel}`;
  }

  // Inactive members still on the roster are checked too.
  const memberInfo = new Map<number, CheckedMember>(team);
  for (const row of rows) {
    if (!memberInfo.has(row.memberId)) memberInfo.set(row.memberId, { nickname: row.nickname, active: row.active, maxG2: null });
  }

  const violations = validateRoster({
    mode,
    dates,
    seats,
    members: memberInfo,
    locks,
    holidays: new Set(Object.keys(holidays)),
    assignments: rows,
  });
  const spread = distribution(
    rows.map((row) => ({ memberId: row.memberId, nickname: row.nickname, area: row.area })),
    new Map([...memberInfo].map(([id, info]) => [id, info.maxG2])),
  );

  return (
    <>
      <Violations violations={violations} />
      <RosterEditor
        weekStart={weekStart}
        mode={mode}
        dates={dates}
        holidays={holidays}
        rows={editorRows}
        seats={cells}
        members={[...team.values()].filter((m) => m.pool !== null).map(({ id, nickname, pool }) => ({ id, nickname, pool }))}
        dutyLabels={dutyLabels}
      />
      {spread.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribusi</CardTitle>
            <CardDescription>Jumlah tugas per anggota minggu ini. Menghitung tugas, bukan jam kerja.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Anggota</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">G2</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">G7</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Studio</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{mode === "lecture" ? "PKL" : "Gedung"}</th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {spread.map((row) => {
                  const overCap = mode === "lecture" && row.maxG2 !== null && row.g2 > row.maxG2;
                  return (
                    <tr key={row.memberId}>
                      <td className="py-2 pr-3 font-medium">{row.nickname}</td>
                      <td className={cn("px-3 py-2 text-right", overCap && "font-semibold text-destructive")}>
                        {row.g2}
                        {mode === "lecture" && row.maxG2 !== null && <span className="text-muted-foreground">/{row.maxG2}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">{row.g7}</td>
                      <td className="px-3 py-2 text-right">{row.studio}</td>
                      <td className="px-3 py-2 text-right">{row.building}</td>
                      <td className="py-2 pl-3 text-right font-medium">{row.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Violations({ violations }: { violations: Violation[] }) {
  const serious = violations.filter((v) => v.severity !== "info");
  const notes = violations.filter((v) => v.severity === "info");
  if (violations.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada pelanggaran aturan dan semua kursi terisi.</p>;
  }
  return (
    <div className="grid gap-2">
      {serious.length > 0 && (
        <ul className="grid gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          {serious.map((v, i) => (
            <li key={i} className="flex items-start gap-2">
              {v.severity === "error" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Error" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-text" aria-label="Peringatan" />
              )}
              {v.message}
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <details className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <Info className="size-4" aria-hidden="true" />
            {notes.length} hari dengan kursi kosong
          </summary>
          <ul className="mt-2 grid gap-1 pl-6 text-muted-foreground">
            {notes.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
