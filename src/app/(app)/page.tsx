import {
  ArrowLeftRight,
  CalendarOff,
  ClipboardList,
  CloudOff,
  Coffee,
  MapPin,
  PartyPopper,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AgendaList } from "@/components/agenda/agenda-item";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SheetFreshness } from "@/components/schedule/freshness";
import { RoomDayCard } from "@/components/schedule/room-card";
import { shiftIcon, shiftTime } from "@/components/shift";
import { Card, CardContent } from "@/components/ui/card";
import { hasRole } from "@/lib/auth/roles";
import { requireMember } from "@/lib/auth/session";
import { getHolidays, getModeToday } from "@/lib/period/queries";
import { areaKey, groupByArea, roomKeysForArea } from "@/lib/rooms/group";
import { getRoomDirectory } from "@/lib/rooms/queries";
import { ADMIN_HOURS, getPublishedRosterWeek } from "@/lib/roster/queries";
import { dutyOn, teammatesOf, type RosterAssignment } from "@/lib/roster/view";
import { slotTimings } from "@/lib/schedule/slots";
import { roomKey } from "@/lib/sheets/cells";
import { getAgenda, getTimetable } from "@/lib/sheets/source";
import { swapCounts } from "@/lib/swap/service";
import { formatLongDate, isoWeekday, timeOfDay, weekStartIso } from "@/lib/time";

export const metadata = { title: "Hari Ini" };

export default async function TodayPage() {
  const member = await requireMember();
  const { today } = await getModeToday();

  return (
    <>
      <AutoRefresh />
      <PageHeader eyebrow={formatLongDate(today)} title={`Halo, ${member.nickname}`} />
      <SwapNotice memberId={member.id} isAdmin={hasRole(member.role, "admin")} />
      <TodayContent memberId={member.id} pool={member.pool} dutyLabel={member.dutyLabel} today={today} />
    </>
  );
}

/** Swap requests waiting on this member (as target) or on any admin. */
async function SwapNotice({ memberId, isAdmin }: { memberId: number; isAdmin: boolean }) {
  const { incoming, awaitingAdmin } = await swapCounts(memberId, isAdmin);
  const notices = [
    incoming > 0 && { href: "/swaps", text: `${incoming} permintaan tukar shift menunggu jawabanmu` },
    awaitingAdmin > 0 && { href: "/admin/swaps", text: `${awaitingAdmin} permintaan tukar shift menunggu persetujuan admin` },
  ].filter((n): n is { href: string; text: string } => Boolean(n));
  if (notices.length === 0) return null;
  return (
    <div className="mb-6 grid gap-2">
      {notices.map((notice) => (
        <Link
          key={notice.href}
          href={notice.href}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent/50"
        >
          <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1">{notice.text}</span>
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

async function TodayContent({
  memberId,
  pool,
  dutyLabel,
  today,
}: {
  memberId: number;
  pool: string | null;
  dutyLabel: string | null;
  today: string;
}) {
  const weekday = isoWeekday(today);
  if (weekday >= 6) {
    return <EmptyState icon={Coffee} title="Akhir pekan" description="Tidak ada shift di hari Sabtu dan Minggu." />;
  }

  const holiday = (await getHolidays(today, today)).get(today);
  if (holiday) {
    return <EmptyState icon={PartyPopper} title={holiday.name} description={holiday.description ?? "Hari libur, tidak ada shift."} />;
  }

  if (pool === null) {
    return (
      <DutyCard
        icon={ShieldCheck}
        label="Admin"
        time={shiftTime(ADMIN_HOURS)}
        place={dutyLabel ?? "Admin UPT Laboratorium"}
      />
    );
  }

  const week = await getPublishedRosterWeek(weekStartIso(today));
  if (!week) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="Roster minggu ini belum terbit"
        description="Shift kamu akan tampil di sini setelah admin menerbitkan roster."
      />
    );
  }

  const duty = dutyOn(week, memberId, today);
  if (!duty) {
    return (
      <EmptyState icon={Coffee} title="Kamu tidak bertugas hari ini">
        <Link href="/roster" className="text-sm font-medium underline underline-offset-4">
          Lihat roster minggu ini
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-8">
      <DutyCard
        icon={shiftIcon(duty.shift.code)}
        label={duty.shift.label}
        time={shiftTime(duty.shift)}
        place={duty.area.name}
      >
        <Teammates teammates={teammatesOf(week, duty)} />
      </DutyCard>
      {week.mode === "lecture" ? <AreaRooms duty={duty} weekday={weekday} /> : <AreaAgenda duty={duty} today={today} />}
    </div>
  );
}

function DutyCard({
  icon: Icon,
  label,
  time,
  place,
  children,
}: {
  icon: LucideIcon;
  label: string;
  time: string;
  place: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">Tugas kamu hari ini</p>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-border">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight">{label}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{time}</p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
          {place}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

function Teammates({ teammates }: { teammates: RosterAssignment[] }) {
  if (teammates.length === 0) return null;
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-sm text-muted-foreground">Rekan di area ini</p>
      <ul className="grid gap-1.5 text-sm">
        {teammates.map((mate) => (
          <li key={mate.member.id} className="flex justify-between gap-4">
            <span className="font-medium">{mate.member.nickname}</span>
            <span className="text-muted-foreground tabular-nums">
              {mate.shift.label} · {shiftTime(mate.shift)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function AreaRooms({ duty, weekday }: { duty: RosterAssignment; weekday: number }) {
  const [timetable, directory] = await Promise.all([getTimetable(), getRoomDirectory()]);
  const keys = roomKeysForArea(duty.area, directory);
  const rooms = (timetable.data?.find((d) => d.weekday === weekday)?.rooms ?? []).filter((room) => keys.has(roomKey(room.code)));
  const groups = groupByArea(rooms, (room) => room.code, directory);
  const timings = slotTimings(weekday, weekday, timeOfDay());

  return (
    <section aria-labelledby="area-rooms" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="area-rooms" className="text-base font-semibold">
          Lab di {duty.area.name}
        </h2>
        <SheetFreshness fetchedAt={timetable.fetchedAt} error={timetable.error} />
      </div>
      {!timetable.data ? (
        <EmptyState icon={CloudOff} title="Jadwal lab belum bisa dimuat" description={timetable.error ?? undefined} />
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada lab terjadwal di area ini.</p>
      ) : (
        groups.map((group) => (
          <div key={areaKey(group)} className="grid gap-2">
            {groups.length > 1 && <h3 className="text-sm font-medium text-muted-foreground">{group.area?.name ?? "Lainnya"}</h3>}
            {group.items.map((room) => (
              <RoomDayCard key={room.code} room={room} timings={timings} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}

async function AreaAgenda({ duty, today }: { duty: RosterAssignment; today: string }) {
  const [agenda, directory] = await Promise.all([getAgenda(), getRoomDirectory()]);
  const keys = roomKeysForArea(duty.area, directory);
  const entries = (agenda.data ?? []).filter((entry) => entry.date === today && keys.has(roomKey(entry.lab)));

  return (
    <section aria-labelledby="area-agenda" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="area-agenda" className="text-base font-semibold">
          Agenda hari ini di {duty.area.name}
        </h2>
        <SheetFreshness fetchedAt={agenda.fetchedAt} error={agenda.error} />
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Tidak ada agenda hari ini" description="Belum ada peminjaman atau maintenance di area ini." />
      ) : (
        <AgendaList entries={entries} />
      )}
    </section>
  );
}
