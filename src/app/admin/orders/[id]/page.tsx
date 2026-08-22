import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { peso, phDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { OrderEditor } from "./editor";
import type {
  Address, Order, OrderItem, Payment, Profile, Service, StatusHistoryEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStaff("/admin/orders");
  const supabase = await createClient();

  const { data: orderRow, error } = await supabase
    .from("orders").select("*").eq("id", id).maybeSingle();
  if (error) console.error("[cleenzy] order read failed:", error);
  if (!orderRow) notFound();

  const order = orderRow as Order;
  const canSeeFinance = ["owner", "manager", "cashier"].includes(profile.role);

  const [
    { data: itemRows }, { data: paymentRows }, { data: historyRows },
    { data: serviceRows }, { data: staffRows },
  ] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
    canSeeFinance
      ? supabase.from("payments").select("*").eq("order_id", id).order("paid_at")
      : Promise.resolve({ data: [] as Payment[] }),
    supabase.from("order_status_history").select("to_status, created_at, note")
      .eq("order_id", id).order("created_at"),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("profiles").select("*").neq("role", "customer").eq("is_active", true),
  ]);

  const allStaff = (staffRows ?? []) as Profile[];

  // Addresses are fetched by id rather than joined so a deleted address leaves
  // the order readable instead of blanking the whole row.
  const addressIds = [order.pickup_address_id, order.delivery_address_id]
    .filter((v): v is string => Boolean(v));
  let addresses: Address[] = [];
  if (addressIds.length > 0) {
    const { data } = await supabase.from("addresses").select("*").in("id", addressIds);
    addresses = (data ?? []) as Address[];
  }

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ChevronLeft size={16} /> All orders
      </Link>

      <PageHeader
        title={order.order_number}
        description={`Booked ${phDateTime(order.placed_at)}${
          canSeeFinance ? ` · ${peso(order.total_amount)}` : ""
        }`}
      />

      <OrderEditor
        order={order}
        items={(itemRows ?? []) as OrderItem[]}
        payments={(paymentRows ?? []) as Payment[]}
        history={(historyRows ?? []) as StatusHistoryEntry[]}
        services={(serviceRows ?? []) as Service[]}
        staff={allStaff.filter((s) => ["laundry_staff", "manager", "owner"].includes(s.role))}
        riders={allStaff.filter((s) => s.role === "rider")}
        pickupAddress={addresses.find((a) => a.id === order.pickup_address_id) ?? null}
        deliveryAddress={addresses.find((a) => a.id === order.delivery_address_id) ?? null}
        canSeeFinance={canSeeFinance}
      />
    </>
  );
}
