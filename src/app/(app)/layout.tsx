import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ModeBadge } from "@/components/mode-badge";
import { BottomNav, SidebarNav } from "@/components/shell/nav-links";
import { hasRole, ROLE_LABEL } from "@/lib/auth/roles";
import { requireMember } from "@/lib/auth/session";
import { MODE_LABEL } from "@/lib/period/resolve";
import { getModeToday } from "@/lib/period/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const member = await requireMember();
  const mode = await getModeToday();
  const isAdmin = hasRole(member.role, "admin");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href="/" className="rounded-md">
            <Brand />
          </Link>
        </div>
        <div className="space-y-1 px-4 py-4">
          <ModeBadge mode={mode.mode} />
          {mode.period && <p className="truncate text-xs text-muted-foreground">{mode.period.name}</p>}
        </div>
        <div className="px-2">
          <SidebarNav mode={mode.mode} role={member.role} />
        </div>
        <div className="mt-auto border-t border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium">{member.nickname}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[member.role]}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <Link href="/" className="rounded-md">
            <Brand />
          </Link>
          <ModeBadge mode={mode.mode} />
        </header>

        {isAdmin && mode.source !== "period" && (
          <div className="flex items-start gap-2 border-b border-border bg-card px-4 py-2.5 text-sm lg:px-8">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden="true" />
            <p>
              Belum ada periode yang mencakup hari ini, jadi mode mengikuti{" "}
              {mode.period ? `periode terakhir (${mode.period.name})` : "bawaan"}: {MODE_LABEL[mode.mode]}.
            </p>
          </div>
        )}

        <main className="flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pt-8 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
          <BottomNav mode={mode.mode} />
        </div>
      </div>
    </div>
  );
}
