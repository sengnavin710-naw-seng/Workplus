export const ADMIN_ROLES = ["owner", "admin", "manager"] as const;

export type OrganizationRole =
  | (typeof ADMIN_ROLES)[number]
  | "employee";

export function isAdminRole(
  role: string | null | undefined,
): role is (typeof ADMIN_ROLES)[number] {
  return ADMIN_ROLES.some((adminRole) => adminRole === role);
}

export function destinationForRole(
  role: string | null | undefined,
): "/dashboard" | "/employee" {
  return isAdminRole(role) ? "/dashboard" : "/employee";
}

export function safeInternalReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
