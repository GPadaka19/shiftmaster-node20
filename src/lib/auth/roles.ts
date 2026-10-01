export type Role = "superadmin" | "admin" | "staff";

const RANK: Record<Role, number> = { staff: 1, admin: 2, superadmin: 3 };

/** True when `role` is `minimum` or higher (superadmin > admin > staff). */
export function hasRole(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

/** Staff signs in with a PIN; admins with Google. */
export function usesPin(role: Role): boolean {
  return role === "staff";
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  staff: "Staf",
};
