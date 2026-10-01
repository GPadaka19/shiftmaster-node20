import { CalendarCog, Users, type LucideIcon } from "lucide-react";
import { hasRole, type Role } from "@/lib/auth/roles";

// Not a client module, so the Akun page (server) and the sidebar (client) can
// both use it.

export type AdminItem = { href: string; label: string; description: string; icon: LucideIcon; minRole: Role };

export const ADMIN_ITEMS: AdminItem[] = [
  {
    href: "/admin/kalender",
    label: "Kalender",
    description: "Periode kuliah/libur dan hari libur",
    icon: CalendarCog,
    minRole: "admin",
  },
  {
    href: "/admin/anggota",
    label: "Anggota",
    description: "Tambah anggota, peran, dan PIN",
    icon: Users,
    minRole: "superadmin",
  },
];

export function adminItemsFor(role: Role): AdminItem[] {
  return ADMIN_ITEMS.filter((item) => hasRole(role, item.minRole));
}
