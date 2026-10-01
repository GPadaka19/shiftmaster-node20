import { Construction } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth/session";

export const metadata = { title: "Jadwal Lab" };

export default async function TimetablePage() {
  await requireMember();
  return (
    <>
      <PageHeader title="Jadwal Lab" description="Jadwal kuliah mingguan dari Google Sheets." />
      <EmptyState icon={Construction} title="Sedang dibangun" description="Jadwal lab tersambung ke Google Sheets mulai Fase 1." />
    </>
  );
}
