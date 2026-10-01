import { Construction } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth/session";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  await requireMember();
  return (
    <>
      <PageHeader title="Agenda Lab" description="Peminjaman lab dan kegiatan maintenance selama libur semester." />
      <EmptyState icon={Construction} title="Sedang dibangun" description="Agenda lab tersambung ke Google Sheets mulai Fase 1." />
    </>
  );
}
