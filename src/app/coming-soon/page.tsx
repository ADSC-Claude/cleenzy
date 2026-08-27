import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/site/coming-soon";
import { getBusiness, getSiteSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coming soon",
  description: "Cleenzy is opening soon.",
  // Overrides the root layout's tagline so a shared link previews the holding
  // page rather than advertising a site nobody can reach yet.
  openGraph: { title: "Cleenzy — coming soon", description: "Cleenzy is opening soon." },
  robots: { index: false, follow: false },
};

// Lives outside the (site) group so the gate in that layout can redirect here
// without looping. Reachable directly too, so a stale link lands somewhere sane.
export default async function ComingSoonPage() {
  const [site, business] = await Promise.all([getSiteSettings(), getBusiness()]);
  if (site.status === "live") redirect("/");
  return <ComingSoon site={site} business={business} />;
}
