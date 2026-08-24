import { redirect } from "next/navigation";
import { getProfile, STAFF_ROLES, ROLE_ACCESS, ALL_ADMIN_SECTIONS } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (!STAFF_ROLES.includes(profile.role)) redirect("/account");
  if (!profile.is_active) redirect("/login?error=inactive");

  const access = ROLE_ACCESS[profile.role];
  const allowed = access.includes("*") ? ALL_ADMIN_SECTIONS : access;

  return (
    <AdminShell role={profile.role} name={profile.full_name || "Staff"} allowed={allowed}>
      {children}
    </AdminShell>
  );
}
