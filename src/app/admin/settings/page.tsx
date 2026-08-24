import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusiness, getPaymentSettings } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";

const DEFAULT_OPS = {
  default_pickup_fee: 50,
  default_delivery_fee: 50,
  free_delivery_over: 1000,
  min_lead_hours: 4,
  standard_turnaround_hours: 24,
};

export default async function SettingsPage() {
  await requireRole("/admin/settings", ["owner"]);
  const supabase = await createClient();

  const [business, payments, { data: opsRow }] = await Promise.all([
    getBusiness(),
    getPaymentSettings(),
    supabase.from("settings").select("value").eq("key", "operations").maybeSingle(),
  ]);

  const operations = {
    ...DEFAULT_OPS,
    ...((opsRow?.value as Partial<typeof DEFAULT_OPS>) ?? {}),
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Owner only. These values appear across the website and on receipts."
      />
      <SettingsForm
        business={business} payments={payments} operations={operations}
      />
    </>
  );
}
