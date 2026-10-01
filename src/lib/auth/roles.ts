export type Role = "superadmin" | "admin" | "staff";

const RANK: Record<Role, number> = { staff: 1, admin: 2, superadmin: 3 };

/** True when `role` is `minimum` or higher (superadmin > admin > staff). */
export function hasRole(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  staff: "Staf",
};
