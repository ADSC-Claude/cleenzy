import Link from "next/link";
import type { Metadata } from "next";
import { Package, MapPin, Wallet, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { peso, phDate, phDateTime, phPhone } from "@/lib/format";
import { ORDER_STATUS_LABEL, UNIT_SHORT } from "@/lib/status";
import {
  Button, Card, EmptyState, PageHeader, StatusBadge, PaymentBadge,
} from "@/components/ui";
import type { Address, Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

const ACTIVE_STATUSES = [
  "placed", "pickup_scheduled", "picked_up", "received", "sorting",
  "washing", "drying", "folding", "quality_check", "packed", "ready",
  "out_for_delivery",
];

export default async function AccountPage() {
  const profile = await requireCustomer("/account");
  const supabase = await createClient();

  const [{ data: orderRows }, { data: addressRows }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("customer_id", profile.id)
      .order("placed_at", { ascending: false })
      .limit(50),
    supabase
      .from("addresses").select("*").eq("customer_id", profile.id)
      .order("is_default", { ascending: false }),
  ]);

  const orders = (orderRows ?? []) as Array<Order & { order_items: OrderItem[] }>;
  const addresses = (addressRows ?? []) as Address[];

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.amount_paid), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        title={`Hi, ${profile.full_name.split(" ")[0] || "there"}`}
        description={profile.email ?? undefined}
        action={
          <form action={signOut}>
            <Button variant="secondary" size="sm" type="submit">
              <LogOut size={15} /> Sign out
            </Button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Package size={18} className="text-accent-600" />
          <p className="mt-2 text-2xl font-semibold text-ink-900">{orders.length}</p>
          <p className="text-sm text-ink-500">Orders placed</p>
        </Card>
        <Card>
          <Wallet size={18} className="text-accent-600" />
          <p className="mt-2 text-2xl font-semibold text-ink-900">{peso(totalSpent)}</p>
          <p className="text-sm text-ink-500">Total paid</p>
        </Card>
        <Card>
          <MapPin size={18} className="text-accent-600" />
          <p className="mt-2 text-2xl font-semibold text-ink-900">{addresses.length}</p>
          <p className="text-sm text-ink-500">Saved addresses</p>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">
          Current orders
        </h2>
        <div className="mt-4 space-y-4">
          {active.length === 0 ? (
            <EmptyState
              title="Nothing in the wash right now"
              description="Book a pickup and your order will show up here."
              action={<Link href="/book"><Button>Book a laundry service</Button></Link>}
            />
          ) : (
            active.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Order history
          </h2>
          <div className="mt-4 space-y-4">
            {past.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">
          Saved addresses
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {addresses.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState
                title="No saved addresses yet"
                description="Addresses you use when booking are saved here automatically."
              />
            </div>
          ) : (
            addresses.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink-900">{a.label}</p>
                  {a.is_default && (
                    <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-800">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-ink-600">
                  {[a.line1, a.barangay, a.city, a.province].filter(Boolean).join(", ")}
                </p>
                {a.landmark && (
                  <p className="mt-1 text-xs text-ink-500">Landmark: {a.landmark}</p>
                )}
                <p className="mt-1 text-xs text-ink-500">{phPhone(a.phone)}</p>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function OrderCard({ order }: { order: Order & { order_items: OrderItem[] } }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-ink-500">{order.order_number}</p>
          <p className="mt-0.5 text-sm text-ink-600">
            Booked {phDateTime(order.placed_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.payment_status} />
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {order.order_items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span className="text-ink-700">
              {i.service_name}
              <span className="ml-1.5 text-ink-500">
                {Number(i.actual_quantity ?? i.quantity)} {UNIT_SHORT[i.unit]}
              </span>
            </span>
            <span className="whitespace-nowrap text-ink-900">{peso(i.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <div className="text-sm">
          <span className="text-ink-500">
            {order.delivery_date
              ? `Delivery ${phDate(order.delivery_date)}`
              : ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-semibold text-ink-900">{peso(order.total_amount)}</p>
          <Link
            href={`/track?order=${encodeURIComponent(order.order_number)}`}
            className="text-sm font-medium text-accent-700 hover:text-accent-800"
          >
            Track
          </Link>
        </div>
      </div>
    </Card>
  );
}
