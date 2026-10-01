"use client";

import { ArrowLeftRight, CalendarCheck, CalendarDays, CircleUser, ClipboardList, LayoutGrid, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { Role } from "@/lib/auth/roles";
import type { Mode } from "@/lib/period/resolve";
import { adminItemsFor } from "./admin-items";

type NavItem = { href: string; label: string; icon: LucideIcon };

const TODAY: NavItem = { href: "/", label: "Hari Ini", icon: CalendarCheck };
const ROSTER: NavItem = { href: "/roster", label: "Roster", icon: LayoutGrid };
const TIMETABLE: NavItem = { href: "/jadwal", label: "Jadwal Lab", icon: CalendarDays };
const AGENDA: NavItem = { href: "/agenda", label: "Agenda", icon: ClipboardList };
const ACCOUNT: NavItem = { href: "/akun", label: "Akun", icon: CircleUser };
const SWAP: NavItem = { href: "/tukar", label: "Tukar", icon: ArrowLeftRight };

/** Counts of things waiting on the member, by href. */
export type NavBadges = Record<string, number>;

/**
 * The timetable is swapped for the agenda during the break. Lab and studio
 * staff get "Tukar" during lecture weeks, the only time shifts can be traded.
 */
function itemsFor(mode: Mode, showSwap: boolean): NavItem[] {
  if (mode === "lecture") return showSwap ? [TODAY, ROSTER, TIMETABLE, SWAP, ACCOUNT] : [TODAY, ROSTER, TIMETABLE, ACCOUNT];
  return [TODAY, AGENDA, ROSTER, ACCOUNT];
}

function Badge({ count, className }: { count: number | undefined; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums",
        className,
      )}
    >
      {count}
      <span className="sr-only"> menunggu</span>
    </span>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const { href, label, icon: Icon } = item;
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <Badge count={badge} />
    </Link>
  );
}

export function SidebarNav({ mode, role, showSwap, badges }: { mode: Mode; role: Role; showSwap: boolean; badges: NavBadges }) {
  const pathname = usePathname();
  const adminItems = adminItemsFor(role);
  return (
    <div className="grid gap-6">
      <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5">
        {itemsFor(mode, showSwap).map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} badge={badges[item.href]} />
        ))}
      </nav>
      {adminItems.length > 0 && (
        <nav aria-label="Kelola" className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">Kelola</p>
          {adminItems.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} badge={badges[item.href]} />
          ))}
        </nav>
      )}
    </div>
  );
}

export function BottomNav({ mode, showSwap, badges }: { mode: Mode; showSwap: boolean; badges: NavBadges }) {
  const pathname = usePathname();
  const items = itemsFor(mode, showSwap);
  // Admin approvals live under Akun on phones, so its badge shows there.
  const badgeFor = (href: string) => (href === "/akun" ? badges["/admin/tukar"] : badges[href]);
  return (
    <nav aria-label="Navigasi utama" className={cn("grid", items.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
      {items.map(({ href, label, icon: Icon }) => {
        // The bottom bar has no admin items; admin pages are reached from Akun.
        const active = isActive(pathname, href) || (href === "/akun" && pathname.startsWith("/admin"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-accent",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <Badge count={badgeFor(href)} className="absolute -top-1.5 right-0.5 h-4 min-w-4 px-1 text-[0.625rem]" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
