import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { peso, phDate, manilaToday, addDays } from "@/lib/format";
import {
  Button, Card, EmptyState, PageHeader, Select, Table, TableWrap, Td, Th,
} from "@/components/ui";
import type { Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const PERIODS: Record<string, { label: string; days: number; bucket: "day" | "week" | "month" }> = {
  "7":   { label: "Last 7 days",   days: 7,   bucket: "day" },
  "30":  { label: "Last 30 days",  days: 30,  bucket: "day" },
  "90":  { label: "Last 90 days",  days: 90,  bucket: "week" },
  "365": { label: "Last 12 months", days: 365, bucket: "month" },
};

/** Groups an ISO timestamp into the bucket label used by the sales table. */
function bucketOf(iso: string, bucket: "day" | "week" | "month"): string {
  const d = new Date(iso);
  if (bucket === "month") return d.toISOString().slice(0, 7);
  if (bucket === "week") {
    const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    // Monday-start weeks, which is how a laundry shop thinks about a week.
    const offset = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - offset);
    return day.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: { searchParams: Promise<{ period?: string }> }) {
  await requireRole("/admin/reports", ["owner", "manager"]);
  const { period } = await searchParams;
  const key = period && PERIODS[period] ? period : "30";
  const { days, bucket, label } = PERIODS[key];
  const from = addDays(manilaToday(), -days);

  const supabase = await createClient();
  const [{ data: orderRows }, { data: paymentRows }, { data: itemRows }] =
    await Promise.all([
      supabase.from("orders").select("*").gte("placed_at", from),
      supabase.from("payments").select("amount, paid_at, method").gte("paid_at", from),
      supabase
        .from("order_items")
        .select("service_name, line_total, quantity, actual_quantity, unit, orders!inner(placed_at, status)")
        .gte("orders.placed_at", from),
    ]);

  const orders = (orderRows ?? []) as Order[];
  const payments = (paymentRows ?? []) as Array<{ amount: number; paid_at: string }>;
  type ItemRow = OrderItem & { orders: { placed_at: string; status: string } | null };
  const items = (itemRows ?? []) as unknown as ItemRow[];

  const completed = orders.filter((o) => o.status === "completed").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const pending = orders.length - completed - cancelled;
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const billed = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const avgOrder = orders.length > 0 ? billed / Math.max(1, orders.length - cancelled) : 0;

  // Sales over time, from payments actually received.
  const salesByBucket = new Map<string, number>();
  for (const p of payments) {
    const b = bucketOf(p.paid_at, bucket);
    salesByBucket.set(b, (salesByBucket.get(b) ?? 0) + Number(p.amount));
  }
  const sales = [...salesByBucket.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 20);
  const peak = Math.max(1, ...sales.map(([, v]) => v));

  // Service performance, excluding cancelled orders.
  const byService = new Map<string, { count: number; revenue: number; qty: number }>();
  for (const item of items) {
    if (item.orders?.status === "cancelled") continue;
    const entry = byService.get(item.service_name) ?? { count: 0, revenue: 0, qty: 0 };
    entry.count += 1;
    entry.revenue += Number(item.line_total);
    entry.qty += Number(item.actual_quantity ?? item.quantity);
    byService.set(item.service_name, entry);
  }
  const services = [...byService.entries()].sort((a, b) => b[1].revenue - a[1].revenue);

  // Customers, keyed by mobile number so guests count as repeat business.
  const byCustomer = new Map<string, { name: string; orders: number; spent: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const k = o.customer_phone;
    const e = byCustomer.get(k) ?? { name: o.customer_name, orders: 0, spent: 0 };
    e.orders += 1;
    e.spent += Number(o.amount_paid);
    byCustomer.set(k, e);
  }
  const topCustomers = [...byCustomer.values()]
    .sort((a, b) => b.spent - a.spent).slice(0, 10);
  const newCustomers = [...byCustomer.values()].filter((c) => c.orders === 1).length;
  const returningCustomers = [...byCustomer.values()].filter((c) => c.orders > 1).length;

  return (
    <>
      <PageHeader
        title="Reports"
        description={label}
        action={
          <form>
            <div className="flex gap-2">
              <Select name="period" defaultValue={key} className="w-44">
                {Object.entries(PERIODS).map(([k, p]) => (
                  <option key={k} value={k}>{p.label}</option>
                ))}
              </Select>
              <Button type="submit" variant="secondary">Apply</Button>
            </div>
          </form>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={peso(collected)} label="Collected" />
        <Stat value={peso(billed)} label="Billed" />
        <Stat value={peso(avgOrder)} label="Average order" />
        <Stat value={String(orders.length)} label="Orders placed" />
        <Stat value={String(completed)} label="Completed" />
        <Stat value={String(pending)} label="In progress" />
        <Stat value={String(cancelled)} label="Cancelled" />
        <Stat
          value={`${newCustomers} / ${returningCustomers}`}
          label="New / returning customers"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-ink-900">
            Sales by {bucket === "day" ? "day" : bucket === "week" ? "week" : "month"}
          </h2>
          {sales.length === 0 ? (
            <div className="mt-4"><EmptyState title="No payments in this period" /></div>
          ) : (
            <ul className="mt-4 space-y-2">
              {sales.map(([b, value]) => (
                <li key={b}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-600">
                      {bucket === "month" ? b : phDate(`${b}T00:00:00+08:00`)}
                    </span>
                    <span className="font-medium text-ink-900">{peso(value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-accent-500"
                      style={{ width: `${(value / peak) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-ink-900">Service performance</h2>
          {services.length === 0 ? (
            <div className="mt-4"><EmptyState title="No services sold in this period" /></div>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Service</Th><Th className="text-right">Orders</Th>
                    <Th className="text-right">Qty</Th><Th className="text-right">Revenue</Th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(([name, s]) => (
                    <tr key={name}>
                      <Td className="font-medium text-ink-900">{name}</Td>
                      <Td className="text-right text-ink-700">{s.count}</Td>
                      <Td className="text-right text-ink-700">
                        {Math.round(s.qty * 10) / 10}
                      </Td>
                      <Td className="text-right font-medium text-ink-900">
                        {peso(s.revenue)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-ink-900">Top customers</h2>
          {topCustomers.length === 0 ? (
            <div className="mt-4"><EmptyState title="No customers in this period" /></div>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th><Th className="text-right">Orders</Th>
                    <Th className="text-right">Paid</Th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={i}>
                      <Td className="font-medium text-ink-900">{c.name}</Td>
                      <Td className="text-right text-ink-700">{c.orders}</Td>
                      <Td className="text-right font-medium text-ink-900">{peso(c.spent)}</Td>
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <p className="text-2xl font-semibold text-ink-900">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </Card>
  );
}
