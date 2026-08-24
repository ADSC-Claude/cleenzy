import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { peso, phDate, phPhone } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/status";
import {
  Button, Card, EmptyState, Input, PageHeader, PaymentBadge, Select,
  StatusBadge, Table, TableWrap, Td, Th,
} from "@/components/ui";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: OrderStatus[] = [
  "placed", "pickup_scheduled", "picked_up", "received", "sorting", "washing",
  "drying", "folding", "quality_check", "packed", "ready", "out_for_delivery",
  "completed", "cancelled",
];

const PAYMENT_OPTIONS: PaymentStatus[] = ["unpaid", "partial", "paid", "refunded"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; q?: string }>;
}) {
  await requireStaff("/admin/orders");
  const { status, payment, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders").select("*").order("placed_at", { ascending: false }).limit(200);

  if (status && STATUS_OPTIONS.includes(status as OrderStatus)) {
    query = query.eq("status", status);
  }
  if (payment && PAYMENT_OPTIONS.includes(payment as PaymentStatus)) {
    query = query.eq("payment_status", payment);
  }
  if (q?.trim()) {
    const term = q.trim().replace(/[%,()]/g, "");
    query = query.or(
      `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) console.error("[cleenzy] orders list failed:", error);
  const orders = (data ?? []) as Order[];

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
        action={
          <Link href="/admin/orders/new">
            <Button><Plus size={17} /> New order</Button>
          </Link>
        }
      />

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              name="q" defaultValue={q ?? ""} className="pl-9"
              placeholder="Order number, name or mobile…"
            />
          </div>
          <Select name="status" defaultValue={status ?? ""} className="sm:w-48">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
            ))}
          </Select>
          <Select name="payment" defaultValue={payment ?? ""} className="sm:w-40">
            <option value="">Any payment</option>
            {PAYMENT_OPTIONS.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      </Card>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders match"
          description="Try clearing the filters, or create a walk-in order."
          action={<Link href="/admin/orders/new"><Button>New order</Button></Link>}
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th><Th>Customer</Th><Th>Type</Th><Th>Schedule</Th>
                  <Th>Status</Th><Th>Payment</Th><Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50">
                    <Td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono text-xs font-medium text-accent-700 hover:text-accent-800"
                      >
                        {o.order_number}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-400">
                        {phDate(o.placed_at)}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium text-ink-900">{o.customer_name}</span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {phPhone(o.customer_phone)}
                      </span>
                    </Td>
                    <Td className="text-xs text-ink-600">
                      {o.order_type === "pickup_delivery" ? "Pickup" : "Drop-off"}
                    </Td>
                    <Td className="text-xs text-ink-600">
                      {o.pickup_date && <span className="block">P: {phDate(o.pickup_date)}</span>}
                      {o.delivery_date && <span className="block">D: {phDate(o.delivery_date)}</span>}
                      {!o.pickup_date && !o.delivery_date && "—"}
                    </Td>
                    <Td><StatusBadge status={o.status} /></Td>
                    <Td><PaymentBadge status={o.payment_status} /></Td>
                    <Td className="text-right">
                      <span className="font-medium text-ink-900">{peso(o.total_amount)}</span>
                      {Number(o.amount_paid) > 0 && Number(o.amount_paid) < Number(o.total_amount) && (
                        <span className="mt-0.5 block text-xs text-amber-700">
                          {peso(Number(o.total_amount) - Number(o.amount_paid))} due
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
