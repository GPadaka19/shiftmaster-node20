import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createMember } from "../actions";
import { todayIso } from "@/lib/time";
import { EMPTY_MEMBER, MemberForm } from "../member-forms";

export const metadata = { title: "Tambah anggota" };

export default async function NewMemberPage() {
  await requireRole("superadmin");
  return (
    <>
      <BackLink />
      <PageHeader title="Tambah anggota" description="Setelah disimpan, atur PIN untuk staf supaya bisa login." />
      <Card>
        <CardContent>
          <MemberForm action={createMember} submitLabel="Simpan anggota" defaults={{ ...EMPTY_MEMBER, startedOn: todayIso() }} />
        </CardContent>
      </Card>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="size-4" aria-hidden="true" />
      Anggota
    </Link>
  );
}
