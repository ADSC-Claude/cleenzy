import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getBusiness, getSiteSettings } from "@/lib/data";
import { getProfile } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";

export default async function SiteLayout({
  children,
}: { children: React.ReactNode }) {
  const [business, site, profile] = await Promise.all([
    getBusiness(), getSiteSettings(), getProfile(),
  ]);

  // Staff keep full access while the site is hidden, so the shop can rehearse
  // booking and tracking end to end before customers arrive. Sign-in itself
  // lives outside this group, so nobody can be locked out by the switch.
  const isStaff = Boolean(
    profile && profile.is_active && STAFF_ROLES.includes(profile.role),
  );

  // Redirect rather than render the holding page in place: a layout that
  // simply drops {children} still streams the real page in the RSC payload,
  // so the only way to keep it off the wire is to abort the response.
  if (site.status === "coming_soon" && !isStaff) redirect("/coming-soon");

  return (
    <div className="flex min-h-screen flex-col">
      {site.status === "coming_soon" && (
        <p className="bg-ink-900 px-4 py-2 text-center text-xs font-semibold text-white">
          Preview — this site is hidden from customers. Turn it on in
          Admin &rarr; Settings &rarr; Website visibility.
        </p>
      )}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter business={business} />
    </div>
  );
}
