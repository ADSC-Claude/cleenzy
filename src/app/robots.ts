import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/data";

// Dynamic because the answer depends on the visibility switch, and a hidden
// site must not be crawled into search results before it opens.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteSettings();

  if (site.status === "coming_soon") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/login", "/signup"] },
  };
}
