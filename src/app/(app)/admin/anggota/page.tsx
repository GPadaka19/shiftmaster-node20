import { asc, eq, sql } from "drizzle-orm";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { POOL_SHORT_LABEL } from "@/lib/members/labels";

export const metadata = { title: "Anggota" };

const ROLE_ORDER = sql`CASE ${members.role} WHEN 'superadmin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END`;

export default async function MembersPage({ searchParams }: PageProps<"/admin/anggota">) {
  await requireRole("superadmin");
  const showInactive = (await searchParams).status === "nonaktif";

  const rows = await db
    .select({
      id: members.id,
      nickname: members.nickname,
      fullName: members.fullName,
      role: members.role,
      pool: members.pool,
      hasPin: sql<boolean>`${members.pinHash} IS NOT NULL`,
      locked: sql<boolean>`COALESCE(${members.pinLockedUntil} > now(), false)`,
    })
    .from(members)
    .where(eq(members.active, !showInactive))
    .orderBy(ROLE_ORDER, asc(members.pool), asc(members.nicknameNormalized));

  return (
    <>
      <PageHeader
        title="Anggota"
        description="Staf, admin, dan superadmin yang bisa masuk ke ShiftMaster."
        actions={
          <Button asChild className="h-10 px-4">
            <Link href="/admin/anggota/baru">
              <Plus aria-hidden="true" />
              Tambah anggota
            </Link>
          </Button>
        }
      />

      <nav aria-label="Status anggota" className="mb-4 flex gap-1">
        {[
          { label: "Aktif", href: "/admin/anggota", current: !showInactive },
          { label: "Nonaktif", href: "/admin/anggota?status=nonaktif", current: showInactive },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.current ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-md px-3 text-sm font-medium",
              tab.current ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title={showInactive ? "Tidak ada anggota nonaktif" : "Belum ada anggota"} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {rows.map((member) => (
            <li key={member.id}>
              <Link
                href={`/admin/anggota/${member.id}`}
                className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{member.nickname}</p>
                  <p className="truncate text-sm text-muted-foreground">{member.fullName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{ROLE_LABEL[member.role]}</Badge>
                  {member.pool && <Badge variant="secondary">{POOL_SHORT_LABEL[member.pool]}</Badge>}
                  {member.role === "staff" &&
                    (member.locked ? (
                      <Badge variant="destructive">PIN terkunci</Badge>
                    ) : !member.hasPin ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        PIN belum diatur
                      </Badge>
                    ) : null)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
