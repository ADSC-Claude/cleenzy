import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getBusiness } from "@/lib/data";

export default async function SiteLayout({
  children,
}: { children: React.ReactNode }) {
  const business = await getBusiness();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter business={business} />
    </div>
  );
}
