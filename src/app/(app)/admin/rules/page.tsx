import { and, asc, eq, isNotNull } from "drizzle-orm";
import { Users } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { areas, memberG2Locks, memberPatterns, members, shifts } from "@/lib/db/schema";
import { POOL_LABEL, type Pool } from "@/lib/members/labels";
import { G2_STRETCH } from "@/lib/roster/constants";
import { getDefaultMaxG2, seatsFor } from "@/lib/roster/service";
import { WEEKDAY_NAMES } from "@/lib/time";
import { DefaultMaxG2Form, MemberRuleForm, type DayRule } from "./rule-forms";

export const metadata = { title: "Aturan" };

const POOLS = ["lab", "studio", "pkl"] as const;

const POOL_HINT: Record<Pool, string> = {
  lab: "Generator merotasi lantai mereka di dalam shift yang dipilih. Kunci G2 memaksa anggota di G2 pada hari itu.",
  studio: "Selalu bertugas di Studio G2 sesuai shift yang dipilih.",
  pkl: "Bertugas satu gedung penuh sesuai shift dan gedung yang dipilih.",
};

export default async function RulesPage() {
  await requireRole("admin");

  const [team, patterns, locks, lectureShifts, allAreas, defaultMaxG2, seats] = await Promise.all([
    db
      .select({ id: members.id, nickname: members.nickname, pool: members.pool, maxG2PerWeek: members.maxG2PerWeek })
      .from(members)
      .where(and(eq(members.active, true), isNotNull(members.pool)))
      .orderBy(asc(members.nicknameNormalized)),
    db.select({ memberId: memberPatterns.memberId, weekday: memberPatterns.weekday, shiftCode: shifts.code, areaCode: areas.code })
      .from(memberPatterns)
      .innerJoin(shifts, eq(memberPatterns.shiftId, shifts.id))
      .leftJoin(areas, eq(memberPatterns.areaId, areas.id)),
    db.select().from(memberG2Locks),
    db.select().from(shifts).where(eq(shifts.mode, "lecture")).orderBy(asc(shifts.sortOrder)),
    db.select().from(areas).orderBy(asc(areas.sortOrder)),
    getDefaultMaxG2(),
    seatsFor("lecture"),
  ]);

  const daysOf = (memberId: number): Record<number, DayRule> => {
    const days: Record<number, DayRule> = {};
    for (const p of patterns.filter((p) => p.memberId === memberId)) {
      days[p.weekday] = { shift: p.shiftCode, area: p.areaCode ?? "", lock: false };
    }
    for (const lock of locks.filter((l) => l.memberId === memberId)) {
      days[lock.weekday] = { ...(days[lock.weekday] ?? { shift: "", area: "" }), lock: true };
    }
    return days;
  };

  // Lab people per weekday and shift, against the floor seats they must fill.
  const labIds = new Set(team.filter((m) => m.pool === "lab").map((m) => m.id));
  const floorSeats = (shiftCode: string) =>
    seats.filter((s) => s.area.kind === "floor" && lectureShifts.find((x) => x.id === s.shift.id)?.code === shiftCode).reduce((n, s) => n + s.capacity, 0);
  const coverage = [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    shifts: lectureShifts.map((shift) => ({
      label: shift.label,
      people: patterns.filter((p) => labIds.has(p.memberId) && p.weekday === weekday && p.shiftCode === shift.code && !p.areaCode).length,
      seats: floorSeats(shift.code),
    })),
  }));

  const shiftOptions = lectureShifts.map((s) => ({ code: s.code, label: s.label }));
  const buildingOptions = allAreas.filter((a) => a.kind === "building").map((a) => ({ code: a.code, label: a.name }));

  return (
    <>
      <PageHeader title="Aturan" description="Aturan yang dipakai generator roster masa kuliah." />

      {team.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada anggota yang masuk roster">
          <Link href="/admin/members" className="text-sm font-medium underline underline-offset-4">
            Tambah anggota dengan pool Lab, Studio, atau PKL
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Kuota G2</CardTitle>
              <CardDescription>
                Batas berapa kali seorang anggota lab ditempatkan di lantai Gedung 2 per minggu. Bisa diubah per anggota di bawah;
                0 berarti hanya G7. Kalau kursi G2 kurang orang, misalnya karena beberapa anggota hanya G7, generator boleh
                menaikkan batas ini {G2_STRETCH} untuk anggota yang memakai batas default, sesedikit mungkin. Batas yang diisi
                per anggota tidak pernah dinaikkan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DefaultMaxG2Form value={defaultMaxG2} />
            </CardContent>
          </Card>

          {POOLS.map((pool) => {
            const group = team.filter((m) => m.pool === pool);
            if (group.length === 0) return null;
            return (
              <Card key={pool}>
                <CardHeader>
                  <CardTitle>{POOL_LABEL[pool]}</CardTitle>
                  <CardDescription>{POOL_HINT[pool]}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {pool === "lab" && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[32rem] text-sm tabular-nums">
                        <caption className="mb-2 text-left text-xs text-muted-foreground">
                          Orang per shift dibanding kursi lantai. Selisih berarti ada kursi kosong atau orang yang tidak kebagian.
                        </caption>
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th scope="col" className="py-1 pr-3 font-medium">Shift</th>
                            {coverage.map((day) => (
                              <th key={day.weekday} scope="col" className="px-3 py-1 font-medium">
                                {WEEKDAY_NAMES[day.weekday]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lectureShifts.map((shift, i) => (
                            <tr key={shift.id}>
                              <th scope="row" className="py-1 pr-3 text-left font-normal text-muted-foreground">
                                {shift.label}
                              </th>
                              {coverage.map((day) => {
                                const { people, seats: total } = day.shifts[i];
                                return (
                                  <td key={day.weekday} className={cn("px-3 py-1", people !== total && "font-semibold text-destructive")}>
                                    {people}/{total}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[9rem_repeat(5,minmax(0,1fr))_6rem] lg:gap-3">
                      <span>Anggota</span>
                      {[1, 2, 3, 4, 5].map((weekday) => (
                        <span key={weekday}>{WEEKDAY_NAMES[weekday]}</span>
                      ))}
                      <span />
                    </div>
                    <div className="divide-y divide-border">
                      {group.map((member) => (
                        <MemberRuleForm
                          key={member.id}
                          memberId={member.id}
                          nickname={member.nickname}
                          pool={pool}
                          days={daysOf(member.id)}
                          maxG2={member.maxG2PerWeek}
                          defaultMaxG2={defaultMaxG2}
                          shifts={shiftOptions}
                          buildings={buildingOptions}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
