import type { UserRole } from "./types";

/**
 * Pure role data, safe to import from client components. It is kept out of
 * lib/auth.ts because that module reaches for next/headers, which cannot be
 * bundled for the browser.
 */

export const STAFF_ROLES: UserRole[] = [
  "owner", "manager", "laundry_staff", "cashier", "rider",
];

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  laundry_staff: "Laundry Staff",
  cashier: "Cashier",
  rider: "Rider",
  customer: "Customer",
};

/**
 * Which admin sections each role can reach. The proxy checks this for
 * navigation and every page re-checks server-side, because a route match is a
 * convenience, not a security boundary — the real one is RLS in Postgres.
 */
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  owner: ["*"],
  manager: [
    "/admin", "/admin/orders", "/admin/queue", "/admin/logistics",
    "/admin/rider", "/admin/services", "/admin/payments", "/admin/customers",
    "/admin/reports", "/admin/staff",
  ],
  cashier: ["/admin", "/admin/orders", "/admin/payments", "/admin/customers"],
  laundry_staff: ["/admin/queue"],
  rider: ["/admin/rider"],
  customer: [],
};

export const ALL_ADMIN_SECTIONS = [
  "/admin", "/admin/orders", "/admin/queue", "/admin/logistics",
  "/admin/rider", "/admin/services", "/admin/payments", "/admin/customers",
  "/admin/reports", "/admin/staff", "/admin/settings",
];

export function canAccess(role: UserRole, path: string): boolean {
  const allowed = ROLE_ACCESS[role] ?? [];
  if (allowed.includes("*")) return true;
  return allowed.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Landing page for a role that hit a section it cannot see. */
export function homeFor(role: UserRole): string {
  if (role === "laundry_staff") return "/admin/queue";
  if (role === "rider") return "/admin/rider";
  if (role === "customer") return "/account";
  return "/admin";
}
