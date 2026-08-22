import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import { ReceiptView } from "./receipt-view";
import type { Order, OrderItem, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("/admin/orders", ["owner", "manager", "cashier"]);

  const supabase = await createClient();
  const [{ data: orderRow }, { data: itemRows }, { data: paymentRows }, business] =
    await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", id).order("paid_at"),
      getBusiness(),
    ]);

  if (!orderRow) notFound();

  return (
    <>
      <Link
        href={`/admin/orders/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800 no-print"
      >
        <ChevronLeft size={16} /> Back to order
      </Link>

      <ReceiptView
        order={orderRow as Order}
        items={(itemRows ?? []) as OrderItem[]}
        payments={(paymentRows ?? []) as Payment[]}
        business={business}
      />
    </>
  );
}
