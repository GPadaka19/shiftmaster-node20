import { CalendarOff, Clock, Coffee, MapPin, PartyPopper, ShieldCheck, Sun, Sunset, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth/session";
import { getModeToday } from "@/lib/period/queries";
import { ADMIN_HOURS, getTodayDuty, type TodayDuty } from "@/lib/roster/queries";
import { formatLongDate } from "@/lib/time";

export const metadata = { title: "Hari Ini" };

const SHIFT_ICON: Record<string, LucideIcon> = { pagi: Sun, siang: Sunset };

export default async function TodayPage() {
  const member = await requireMember();
  const { today } = await getModeToday();
  const duty = await getTodayDuty(member, today);

  return (
    <>
      <PageHeader eyebrow={formatLongDate(today)} title={`Halo, ${member.nickname}`} />
      <DutySection duty={duty} />
    </>
  );
}

function DutySection({ duty }: { duty: TodayDuty }) {
  switch (duty.kind) {
    case "weekend":
      return <EmptyState icon={Coffee} title="Akhir pekan" description="Tidak ada shift di hari Sabtu dan Minggu." />;
    case "holiday":
      return <EmptyState icon={PartyPopper} title={duty.name} description={duty.description ?? "Hari libur, tidak ada shift."} />;
    case "unpublished":
      return (
        <EmptyState
          icon={CalendarOff}
          title="Roster minggu ini belum terbit"
          description="Shift kamu akan tampil di sini setelah admin menerbitkan roster."
        />
      );
    case "off":
      return <EmptyState icon={Coffee} title="Kamu tidak bertugas hari ini" />;
    case "admin":
      return (
        <DutyCard
          icon={ShieldCheck}
          label="Admin"
          time={`${ADMIN_HOURS.start}–${ADMIN_HOURS.end}`}
          place={duty.label ?? "Admin UPT Laboratorium"}
        />
      );
    case "duty":
      return (
        <DutyCard
          icon={SHIFT_ICON[duty.shiftCode] ?? Clock}
          label={duty.shiftLabel}
          time={`${duty.start}–${duty.end}`}
          place={duty.areaName}
        />
      );
  }
}

function DutyCard({ icon: Icon, label, time, place }: { icon: LucideIcon; label: string; time: string; place: string }) {
  return (
    <Card>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
