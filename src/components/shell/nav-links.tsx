"use client";

import { CalendarCheck, CalendarDays, CircleUser, ClipboardList, LayoutGrid, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { Mode } from "@/lib/period/resolve";

type NavItem = { href: string; label: string; icon: LucideIcon };

const TODAY: NavItem = { href: "/", label: "Hari Ini", icon: CalendarCheck };
const ROSTER: NavItem = { href: "/roster", label: "Roster", icon: LayoutGrid };
const TIMETABLE: NavItem = { href: "/jadwal", label: "Jadwal Lab", icon: CalendarDays };
const AGENDA: NavItem = { href: "/agenda", label: "Agenda", icon: ClipboardList };
const ACCOUNT: NavItem = { href: "/akun", label: "Akun", icon: CircleUser };

/** Four items in both modes: the timetable is swapped for the agenda during the break. */
function itemsFor(mode: Mode): NavItem[] {
  return mode === "lecture" ? [TODAY, ROSTER, TIMETABLE, ACCOUNT] : [TODAY, AGENDA, ROSTER, ACCOUNT];
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ mode }: { mode: Mode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5">
      {itemsFor(mode).map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ mode }: { mode: Mode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="grid grid-cols-4">
      {itemsFor(mode).map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
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
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-accent",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
