import { desc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLog, members } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/time";
import { setMemberPin, updateMember } from "../actions";
import { ActiveToggle, MemberForm, PinForm } from "../member-forms";

export const metadata = { title: "Detail anggota" };

const AUDIT_LABEL: Record<string, string> = {
  "member.bootstrap": "Dibuat sebagai superadmin pertama",
  "member.create": "Ditambahkan",
  "member.update": "Data diubah",
  "member.pin.set": "PIN diatur oleh superadmin",
  "member.pin.change": "PIN diganti sendiri",
  "member.activate": "Diaktifkan",
  "member.deactivate": "Dinonaktifkan",
};

const actor = alias(members, "actor");

export default async function MemberDetailPage({ params, searchParams }: PageProps<"/admin/anggota/[id]">) {
  await requireRole("superadmin");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const justCreated = (await searchParams).baru === "1";

  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member) notFound();

  const history = await db
    .select({ action: auditLog.action, createdAt: auditLog.createdAt, actor: actor.nickname })
    .from(auditLog)
    .leftJoin(actor, eq(auditLog.actorId, actor.id))
    .where(eq(auditLog.subject, `member:${id}`))
    .orderBy(desc(auditLog.createdAt))
    .limit(10);

  const pinLocked = member.pinLockedUntil !== null && member.pinLockedUntil > new Date();

  return (
    <>
      <Link href="/admin/anggota" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anggota
      </Link>
      <PageHeader
        title={member.nickname}
        description={member.fullName}
        actions={
          <div className="flex gap-1.5">
            <Badge variant="outline">{ROLE_LABEL[member.role]}</Badge>
            {!member.active && <Badge variant="destructive">Nonaktif</Badge>}
          </div>
        }
      />

      <div className="grid gap-4">
        {justCreated && (
          <Alert>
            <AlertDescription>
              Anggota ditambahkan.{member.role === "staff" ? " Atur PIN di bawah supaya bisa login." : " Login lewat Google dengan email yang didaftarkan."}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Data anggota</CardTitle>
            <CardDescription>Mengganti peran mengeluarkan anggota ini dari semua perangkat.</CardDescription>
          </CardHeader>
          <CardContent>
            <MemberForm
              action={updateMember.bind(null, id)}
              submitLabel="Simpan perubahan"
              defaults={{
                nickname: member.nickname,
                fullName: member.fullName,
                email: member.email ?? "",
                role: member.role,
                pool: member.pool ?? "none",
                dutyLabel: member.dutyLabel ?? "",
              }}
            />
          </CardContent>
        </Card>

        {member.role === "staff" && (
          <Card>
            <CardHeader>
              <CardTitle>PIN</CardTitle>
              <CardDescription>
                {pinLocked
                  ? "Terkunci karena terlalu banyak salah PIN. Mengatur PIN baru membuka kuncian."
                  : member.pinHash
                    ? "PIN sudah diatur. Mengatur ulang mengeluarkan anggota dari semua perangkat."
                    : "PIN belum diatur, jadi anggota belum bisa login."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PinForm action={setMemberPin.bind(null, id)} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>
              {member.active
                ? "Anggota nonaktif tidak bisa login dan tidak masuk roster. Datanya tetap disimpan."
                : "Anggota ini sedang nonaktif."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveToggle memberId={id} active={member.active} />
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Riwayat perubahan</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2 text-sm">
                {history.map((entry, index) => (
                  <li key={index} className="flex flex-wrap justify-between gap-x-4">
                    <span>
                      {AUDIT_LABEL[entry.action] ?? entry.action}
                      {entry.actor && <span className="text-muted-foreground"> · oleh {entry.actor}</span>}
                    </span>
                    <time className="text-muted-foreground tabular-nums">{formatDateTime(entry.createdAt)}</time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
