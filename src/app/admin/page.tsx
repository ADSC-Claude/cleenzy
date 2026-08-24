import Link from "next/link";
import {
  ClipboardPlus, Truck, PackageCheck, WashingMachine,
  CheckCircle2, Bike, XCircle, Wallet, ArrowRight,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { manilaToday, peso, phDateTime } from "@/lib/format";
import { Card, PageHeader, StatusBadge, Table, TableWrap, Td, Th, EmptyState } from "@/components/ui";
import type { Order, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const LAUNDRY_STATES: OrderStatus[] = [
  "received", "sorting", "washing", "drying", "folding", "quality_check", "packed",
];

export default async function AdminDashboard() {
  const profile = await requireStaff("/admin");
  const supabase = await createClient();
  const today = manilaToday();

  // One read of the live board plus today's closed work; the counts below are
  // derived in memory rather than as a dozen round trips.
  const [{ data: openRows }, { data: closedRows }, { data: paymentRows }, { data: recentRows }] =
    await Promise.all([
      supabase.from("orders").select("*").not("status", "in", "(completed,cancelled)"),
      supabase.from("orders").select("id,status,completed_at,cancelled_at,total_amount")
        .or(`completed_at.gte.${today},cancelled_at.gte.${today}`),
      supabase.from("payments").select("amount,paid_at").gte("paid_at", today),
      supabase.from("orders").select("*").order("placed_at", { ascending: false }).limit(8),
    ]);

  const open = (openRows ?? []) as Order[];
  const closed = (closedRows ?? []) as Array<Pick<Order, "id" | "status" | "total_amount">>;
  const recent = (recentRows ?? []) as Order[];

  const count = (fn: (o: Order) => boolean) => open.filter(fn).length;

  const newOrders   = count((o) => o.status === "placed");
  const forPickup   = count((o) => o.pickup_date === today && ["placed", "pickup_scheduled"].includes(o.status));
  const pickedUp    = count((o) => o.status === "picked_up");
  const inLaundry   = count((o) => LAUNDRY_STATES.includes(o.status));
  const ready       = count((o) => o.status === "ready");
  const forDelivery = count((o) => o.delivery_date === today && ["ready", "out_for_delivery"].includes(o.status));
  const completed   = closed.filter((o) => o.status === "completed").length;
  const cancelled   = closed.filter((o) => o.status === "cancelled").length;
  const revenue     = (paymentRows ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const cards = [
    { label: "New Orders",   value: newOrders,   icon: ClipboardPlus, href: "/admin/orders?status=placed" },
    { label: "For Pickup",   value: forPickup,   icon: Truck,         href: "/admin/logistics" },
    { label: "Picked Up",    value: pickedUp,    icon: PackageCheck,  href: "/admin/orders?status=picked_up" },
    { label: "In Laundry",   value: inLaundry,   icon: WashingMachine, href: "/admin/queue" },
    { label: "Ready",        value: ready,       icon: CheckCircle2,  href: "/admin/orders?status=ready" },
    { label: "For Delivery", value: forDelivery, icon: Bike,          href: "/admin/logistics?tab=delivery" },
    { label: "Completed",    value: completed,   icon: CheckCircle2,  href: "/admin/orders?status=completed" },
    { label: "Cancelled",    value: cancelled,   icon: XCircle,       href: "/admin/orders?status=cancelled" },
  ];

  const summary: Array<{ label: string; value: number }> = [
    { label: "New", value: newOrders },
    { label: "Pickup today", value: forPickup },
    { label: "Washing", value: count((o) => o.status === "washing") },
    { label: "Ready", value: ready },
    { label: "Delivery today", value: forDelivery },
    { label: "Completed today", value: completed },
  ];

  return (
    <>
      <PageHeader
        title={`Good day, ${profile.full_name.split(" ")[0] || "there"}`}
        description={`Today at a glance — ${phDateTime(new Date()).split(",")[0]}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="h-full p-4 transition-colors hover:border-accent-300">
              <c.icon size={18} className="text-accent-600" />
              <p className="mt-2 text-2xl font-semibold text-ink-900">{c.value}</p>
              <p className="text-xs text-ink-500">{c.label}</p>
            </Card>
          </Link>
        ))}

        <Card className="col-span-2 bg-accent-600 p-4 text-white sm:col-span-3 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <Wallet size={18} className="text-accent-100" />
              <p className="mt-2 text-3xl font-semibold">{peso(revenue)}</p>
              <p className="text-sm text-accent-100">
                Collected today across {(paymentRows ?? []).length} payment
                {(paymentRows ?? []).length === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              href="/admin/payments"
              className="hidden items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25 sm:flex"
            >
              Payments <ArrowRight size={15} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-semibold text-ink-900">Status summary</h2>
          <TableWrap>
            <Table>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.label}>
                    <Td className="text-ink-600">{s.label}</Td>
                    <Td className="text-right font-semibold text-ink-900">{s.value}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Latest orders</h2>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-accent-700 hover:text-accent-800"
            >
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No orders yet"
                description="Bookings from the website will appear here."
              />
            </div>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th><Th>Customer</Th><Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="hover:bg-ink-50">
                      <Td>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono text-xs font-medium text-accent-700 hover:text-accent-800"
                        >
                          {o.order_number}
                        </Link>
                      </Td>
                      <Td className="text-ink-800">{o.customer_name}</Td>
                      <Td><StatusBadge status={o.status} /></Td>
                      <Td className="text-right font-medium text-ink-900">
                        {peso(o.total_amount)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}
