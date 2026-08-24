import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./env";
import { STAFF_ROLES, canAccess, homeFor } from "./roles";
import type { Profile, UserRole } from "./types";

export { STAFF_ROLES, ROLE_LABEL, ROLE_ACCESS, ALL_ADMIN_SECTIONS, canAccess, homeFor } from "./roles";

/** Cached per request so a page and its children share one lookup. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  // Treated as signed out rather than thrown, so an unconfigured deployment
  // lands on the sign-in page with an explanation instead of a 500.
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();

    return (data as Profile) ?? null;
  } catch (err) {
    console.error("[cleenzy] could not load the signed-in profile:", err);
    return null;
  }
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
