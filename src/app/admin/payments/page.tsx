import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { peso, phDateTime, manilaToday, addDays, phPhone } from "@/lib/format";
import {
  Card, EmptyState, PageHeader, PaymentBadge, Table, TableWrap, Td, Th, Select, Button,
} from "@/components/ui";
import type { Order, Payment, PaymentMethod } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGES: Record<string, { label: string; days: number }> = {
  today: { label: "Today", days: 0 },
  "7": { label: "Last 7 days", days: 7 },
  "30": { label: "Last 30 days", days: 30 },
  "90": { label: "Last 90 days", days: 90 },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash", gcash: "GCash", bank_transfer: "Bank transfer", card: "Card",
};

export default async function PaymentsPage({
  searchParams,
}: { searchParams: Promise<{ range?: string }> }) {
  await requireRole("/admin/payments", ["owner", "manager", "cashier"]);
  const { range } = await searchParams;
  const key = range && RANGES[range] ? range : "7";
  const from = addDays(manilaToday(), -RANGES[key].days);

  const supabase = await createClient();
  const [{ data: paymentRows }, { data: unpaidRows }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, orders ( order_number, customer_name )")
      .gte("paid_at", from)
      .order("paid_at", { ascending: false })
      .limit(300),
    supabase
      .from("orders")
      .select("*")
      .in("payment_status", ["unpaid", "partial"])
      .not("status", "eq", "cancelled")
      .order("placed_at", { ascending: true })
      .limit(100),
  ]);

  type Row = Payment & { orders: { order_number: string; customer_name: string } | null };
  const payments = (paymentRows ?? []) as unknown as Row[];
  const unpaid = (unpaidRows ?? []) as Order[];

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount);
    return acc;
  }, {});
  const outstanding = unpaid.reduce(
    (s, o) => s + (Number(o.total_amount) - Number(o.amount_paid)), 0,
  );

  return (
    <>
      <PageHeader
        title="Payments"
        description="Cash, GCash and bank transfers recorded against orders."
        action={
          <form>
            <div className="flex gap-2">
              <Select name="range" defaultValue={key} className="w-40">
                {Object.entries(RANGES).map(([k, r]) => (
                  <option key={k} value={k}>{r.label}</option>
                ))}
              </Select>
              <Button type="submit" variant="secondary">Apply</Button>
            </div>
          </form>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-2xl font-semibold text-ink-900">{peso(total)}</p>
          <p className="text-sm text-ink-500">Collected · {RANGES[key].label}</p>
        </Card>
        {(["cash", "gcash", "bank_transfer"] as PaymentMethod[]).map((m) => (
          <Card key={m}>
            <p className="text-2xl font-semibold text-ink-900">{peso(byMethod[m] ?? 0)}</p>
            <p className="text-sm text-ink-500">{METHOD_LABEL[m]}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="p-0 sm:p-0">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="font-semibold text-ink-900">Recent payments</h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState title="No payments in this period" />
            </div>
          ) : (
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Order</Th><Th>Method</Th><Th>When</Th>
                      <Th className="text-right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <Td>
                          <Link
                            href={`/admin/orders/${p.order_id}`}
                            className="font-mono text-xs font-medium text-accent-700 hover:text-accent-800"
                          >
                            {p.orders?.order_number ?? "—"}
                          </Link>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {p.orders?.customer_name ?? ""}
                          </span>
                        </Td>
                        <Td className="text-xs text-ink-700">
                          {METHOD_LABEL[p.method]}
                          {p.reference_number && (
                            <span className="mt-0.5 block font-mono text-ink-400">
                              {p.reference_number}
                            </span>
                          )}
                        </Td>
                        <Td className="text-xs text-ink-600">{phDateTime(p.paid_at)}</Td>
                        <Td className="text-right font-medium text-ink-900">
                          {peso(p.amount)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
          )}
        </Card>

        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="font-semibold text-ink-900">Awaiting payment</h2>
            <span className="text-sm font-medium text-amber-700">{peso(outstanding)}</span>
          </div>
          {unpaid.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState title="Everything is settled" />
            </div>
          ) : (
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Order</Th><Th>Customer</Th><Th>Status</Th>
                      <Th className="text-right">Due</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaid.map((o) => (
                      <tr key={o.id}>
                        <Td>
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="font-mono text-xs font-medium text-accent-700 hover:text-accent-800"
                          >
                            {o.order_number}
                          </Link>
                        </Td>
                        <Td>
                          <span className="text-sm text-ink-800">{o.customer_name}</span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {phPhone(o.customer_phone)}
                          </span>
                        </Td>
                        <Td><PaymentBadge status={o.payment_status} /></Td>
                        <Td className="text-right font-medium text-amber-700">
                          {peso(Number(o.total_amount) - Number(o.amount_paid))}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
