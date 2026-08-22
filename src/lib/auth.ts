import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile, UserRole } from "./types";

/** Roles that may open the admin area at all. */
export const STAFF_ROLES: UserRole[] = [
  "owner", "manager", "laundry_staff", "cashier", "rider",
];

/**
 * Which admin sections each role can reach. The middleware checks this for
 * navigation and every page re-checks server-side, because a middleware
 * match is a convenience, not a security boundary.
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

/** Cached per request so a page and its children share one lookup. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  return (data as Profile) ?? null;
});

/** Guards an admin page. Redirects rather than throwing, so links stay usable. */
export async function requireStaff(path: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!STAFF_ROLES.includes(profile.role)) redirect("/account");
  if (!profile.is_active) redirect("/login?error=inactive");
  if (!canAccess(profile.role, path)) redirect(homeFor(profile.role));
  return profile;
}

/** Guards a page that must be one of an explicit set of roles. */
export async function requireRole(
  path: string, roles: UserRole[],
): Promise<Profile> {
  const profile = await requireStaff(path);
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return profile;
}

export async function requireCustomer(path: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(path)}`);
  return profile;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  laundry_staff: "Laundry Staff",
  cashier: "Cashier",
  rider: "Rider",
  customer: "Customer",
};
