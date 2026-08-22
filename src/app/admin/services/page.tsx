import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ServicesManager } from "./manager";
import type { Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  await requireRole("/admin/services", ["owner", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").order("sort_order");

  return (
    <>
      <PageHeader
        title="Services & Pricing"
        description="Changes here appear on the website straight away."
      />
      <ServicesManager services={(data ?? []) as Service[]} />
    </>
  );
}
