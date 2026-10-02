import { Activity, CalendarCog, ChartNoAxesColumn, CheckCheck, ListChecks, SquarePen, Users, type LucideIcon } from "lucide-react";
import { hasRole, type Role } from "@/lib/auth/roles";

// Not a client module, so the account page (server) and the sidebar (client) can
// both use it.

export type AdminItem = { href: string; label: string; description: string; icon: LucideIcon; minRole: Role };

export const ADMIN_ITEMS: AdminItem[] = [
  {
    href: "/admin/roster",
    label: "Editor Roster",
    description: "Generate, ubah, dan terbitkan roster mingguan",
    icon: SquarePen,
    minRole: "admin",
  },
  {
    href: "/admin/swaps",
    label: "Persetujuan Tukar",
    description: "Setujui atau tolak permintaan tukar shift",
    icon: CheckCheck,
    minRole: "admin",
  },
  {
    href: "/admin/rules",
    label: "Aturan",
    description: "Pola Pagi/Siang, batas dan kunci G2",
    icon: ListChecks,
    minRole: "admin",
  },
  {
    href: "/admin/calendar",
    label: "Kalender",
    description: "Periode kuliah/libur dan hari libur",
    icon: CalendarCog,
    minRole: "admin",
  },
  {
    href: "/admin/status",
    label: "Status",
    description: "Sinkronisasi Google Sheets",
    icon: Activity,
    minRole: "admin",
  },
  {
    href: "/admin/activity",
    label: "Aktivitas",
    description: "Anggota paling aktif: masuk, halaman, dan klik",
    icon: ChartNoAxesColumn,
    minRole: "admin",
  },
  {
    href: "/admin/members",
    label: "Anggota",
    description: "Tambah anggota, peran, dan PIN",
    icon: Users,
    minRole: "superadmin",
  },
];

export function adminItemsFor(role: Role): AdminItem[] {
  return ADMIN_ITEMS.filter((item) => hasRole(role, item.minRole));
}
