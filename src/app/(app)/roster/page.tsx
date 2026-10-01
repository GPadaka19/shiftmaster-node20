import { Construction } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth/session";

export const metadata = { title: "Roster" };

export default async function RosterPage() {
  await requireMember();
  return (
    <>
      <PageHeader title="Roster" description="Pembagian shift per minggu dan riwayatnya." />
      <EmptyState icon={Construction} title="Sedang dibangun" description="Roster mingguan dan riwayat tampil di sini mulai Fase 1." />
    </>
  );
}
