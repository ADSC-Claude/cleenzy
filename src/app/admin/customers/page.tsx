import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { peso, phDate, phPhone } from "@/lib/format";
import {
  Badge, Card, EmptyState, Input, PageHeader, Table, TableWrap, Td, Th, Button,
} from "@/components/ui";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CustomerSummary {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  orders: number;
  spent: number;
  outstanding: number;
  firstOrder: string;
  lastOrder: string;
  hasAccount: boolean;
  lastOrderId: string;
}

export default async function CustomersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  await requireRole("/admin/customers", ["owner", "manager", "cashier"]);
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_id, customer_name, customer_phone, customer_email, total_amount, amount_paid, placed_at, status")
    .order("placed_at", { ascending: false })
    .limit(2000);

  if (error) console.error("[cleenzy] customers read failed:", error);
  const orders = (data ?? []) as Order[];

  // Guests have no account, so the mobile number is the identity that actually
  // links repeat business together.
  const map = new Map<string, CustomerSummary>();
  for (const o of orders) {
    const key = o.customer_phone || o.id;
    const existing = map.get(key);
    const spent = o.status === "cancelled" ? 0 : Number(o.amount_paid);
    const due = o.status === "cancelled"
      ? 0 : Number(o.total_amount) - Number(o.amount_paid);

    if (!existing) {
      map.set(key, {
        key,
        name: o.customer_name,
        phone: o.customer_phone,
        email: o.customer_email,
        orders: 1,
        spent,
        outstanding: due,
        firstOrder: o.placed_at,
        lastOrder: o.placed_at,
        hasAccount: Boolean(o.customer_id),
        lastOrderId: o.id,
      });
    } else {
      existing.orders += 1;
      existing.spent += spent;
      existing.outstanding += due;
      existing.hasAccount = existing.hasAccount || Boolean(o.customer_id);
      existing.email = existing.email ?? o.customer_email;
      if (o.placed_at < existing.firstOrder) existing.firstOrder = o.placed_at;
      if (o.placed_at > existing.lastOrder) {
        existing.lastOrder = o.placed_at;
        existing.lastOrderId = o.id;
      }
    }
  }

  let customers = [...map.values()].sort((a, b) => b.spent - a.spent);

  const topSpenders = new Set(customers.slice(0, 5).map((c) => c.key));
  const returning = customers.filter((c) => c.orders > 1).length;
  const totalSpent = customers.reduce((s, c) => s + c.spent, 0);

  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term.replace(/\D/g, "")) ||
        (c.email ?? "").toLowerCase().includes(term),
    );
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${map.size} customer${map.size === 1 ? "" : "s"} · ${returning} returning`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-2xl font-semibold text-ink-900">{map.size}</p>
          <p className="text-sm text-ink-500">Total customers</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-ink-900">{returning}</p>
          <p className="text-sm text-ink-500">Returning (2+ orders)</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold text-ink-900">{peso(totalSpent)}</p>
          <p className="text-sm text-ink-500">Lifetime revenue</p>
        </Card>
      </div>

      <Card className="mt-5 mb-5">
        <form className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""}
                 placeholder="Search name, mobile or email…" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </Card>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Customers appear here as soon as their first order is placed."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th><Th>Orders</Th><Th>First</Th><Th>Last</Th>
                  <Th className="text-right">Spent</Th><Th className="text-right">Due</Th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.key} className="hover:bg-ink-50">
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink-900">{c.name}</span>
                        {topSpenders.has(c.key) && (
                          <Badge className="bg-accent-100 text-accent-800">Top</Badge>
                        )}
                        {c.orders === 1 && (
                          <Badge className="bg-sky-100 text-sky-800">New</Badge>
                        )}
                        {!c.hasAccount && (
                          <Badge className="bg-ink-100 text-ink-600">Guest</Badge>
                        )}
                      </div>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {phPhone(c.phone)}{c.email ? ` · ${c.email}` : ""}
                      </span>
                    </Td>
                    <Td className="text-ink-800">{c.orders}</Td>
                    <Td className="text-xs text-ink-600">{phDate(c.firstOrder)}</Td>
                    <Td className="text-xs text-ink-600">
                      <Link
                        href={`/admin/orders/${c.lastOrderId}`}
                        className="text-accent-700 hover:text-accent-800"
                      >
                        {phDate(c.lastOrder)}
                      </Link>
                    </Td>
                    <Td className="text-right font-medium text-ink-900">{peso(c.spent)}</Td>
                    <Td className="text-right">
                      {c.outstanding > 0
                        ? <span className="font-medium text-amber-700">{peso(c.outstanding)}</span>
                        : <span className="text-xs text-ink-400">—</span>}
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
