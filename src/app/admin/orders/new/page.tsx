import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { WalkInForm } from "./form";
import type { Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requireRole("/admin/orders", ["owner", "manager", "cashier"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("services").select("*").eq("is_active", true).order("sort_order");

  const services = (data ?? []) as Service[];

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ChevronLeft size={16} /> All orders
      </Link>
      <PageHeader
        title="New order"
        description="For walk-ins and phone bookings."
      />
      {services.length === 0 ? (
        <EmptyState
          title="No active services"
          description="Add a service under Services & Pricing before creating orders."
        />
      ) : (
        <WalkInForm services={services} />
      )}
    </>
  );
}
