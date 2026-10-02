import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { ActivityTracker } from "@/components/activity/activity-tracker";
import { Brand } from "@/components/brand";
import { ModeBadge } from "@/components/mode-badge";
import { InstallCard } from "@/components/pwa/install-card";
import { BottomNav, SidebarNav } from "@/components/shell/nav-links";
import { hasRole, ROLE_LABEL } from "@/lib/auth/roles";
import { requireMember } from "@/lib/auth/session";
import { MODE_LABEL } from "@/lib/period/resolve";
import { getModeToday } from "@/lib/period/queries";
import { swapAvailable } from "@/lib/swap/rules";
import { swapCounts } from "@/lib/swap/service";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The mode does not depend on who is signed in, so its query starts first.
  const modeToday = getModeToday();
  const member = await requireMember();
  const isAdmin = hasRole(member.role, "admin");
  const [mode, counts] = await Promise.all([modeToday, swapCounts(member.id, isAdmin)]);
  const showSwap = swapAvailable(mode.mode, member.pool);
  const badges = { "/swaps": counts.incoming, "/admin/swaps": counts.awaitingAdmin };

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
          <SidebarNav mode={mode.mode} role={member.role} showSwap={showSwap} badges={badges} />
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
          <InstallCard />
          <ActivityTracker />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
          <BottomNav mode={mode.mode} showSwap={showSwap} badges={badges} />
        </div>
      </div>
    </div>
  );
}
