"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createWalkInOrder } from "../../actions";
import { quote } from "@/lib/pricing";
import { peso, manilaToday, addDays } from "@/lib/format";
import { UNIT_LABEL, UNIT_SHORT } from "@/lib/status";
import {
  Alert, Button, Card, CardTitle, Field, Input, Select, Textarea,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PaymentMethod, Service } from "@/lib/types";

export function WalkInForm({ services }: { services: Service[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [orderType, setOrderType] = useState<"pickup_delivery" | "dropoff">("dropoff");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [deliveryDate, setDeliveryDate] = useState(addDays(manilaToday(), 1));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  const selections = useMemo(
    () => Object.entries(quantities)
      .map(([serviceId, q]) => ({ serviceId, quantity: Number(q) || 0 }))
      .filter((s) => s.quantity > 0),
    [quantities],
  );

  const q = useMemo(
    () => quote({ selections, services, orderType, area: null }),
    [selections, services, orderType],
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createWalkInOrder({
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        selections,
        order_type: orderType,
        delivery_date: deliveryDate || null,
        payment_method: paymentMethod,
        notes,
      });
      if (result.ok) router.push(`/admin/orders/${result.orderId}`);
      else setError(result.error);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {error && <Alert tone="error">{error}</Alert>}

        <Card>
          <CardTitle>Customer</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="Maria Santos" />
            </Field>
            <Field label="Mobile number" required>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                     inputMode="tel" placeholder="0917 555 1234" />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="Optional" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Services</CardTitle>
          <div className="mt-4 space-y-3">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-500">
                    {peso(s.price)} {UNIT_LABEL[s.unit]}
                    {Number(s.min_quantity) > 1 &&
                      ` · min ${Number(s.min_quantity)} ${UNIT_SHORT[s.unit]}`}
                  </p>
                </div>
                <Input
                  type="number" min={0} step={s.unit === "per_kg" ? 0.1 : 1}
                  className="w-28 shrink-0"
                  placeholder="0"
                  value={quantities[s.id] ?? ""}
                  onChange={(e) =>
                    setQuantities((p) => ({ ...p, [s.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Order details</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Order type">
              <Select
                value={orderType}
                onChange={(e) =>
                  setOrderType(e.target.value as "pickup_delivery" | "dropoff")
                }
              >
                <option value="dropoff">Drop-off at shop</option>
                <option value="pickup_delivery">Pickup & delivery</option>
              </Select>
            </Field>
            <Field
              label={orderType === "dropoff" ? "Ready by" : "Delivery date"}
            >
              <Input type="date" min={manilaToday()} value={deliveryDate}
                     onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <Field label="Payment method">
              <Select value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anything the team should know." />
            </Field>
          </div>
        </Card>
      </div>

      <div>
        <Card className="lg:sticky lg:top-20">
          <CardTitle>Summary</CardTitle>
          {q.lines.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              Enter a quantity against at least one service.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {q.lines.map((l) => (
                <li key={l.serviceId} className="flex justify-between gap-3">
                  <span className="text-ink-700">
                    {l.name}
                    <span className="ml-1.5 text-ink-500">
                      {l.billedQuantity} {UNIT_SHORT[l.unit]}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-ink-900">
                    {peso(l.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex justify-between border-t border-ink-100 pt-3">
            <span className="font-semibold text-ink-900">Total</span>
            <span className="font-semibold text-ink-900">{peso(q.total)}</span>
          </div>

          <Button
            className={cn("mt-4 w-full")}
            disabled={pending || q.lines.length === 0}
            onClick={submit}
          >
            {pending ? <><Loader2 size={16} className="animate-spin" /> Creating…</>
                     : "Create order"}
          </Button>
          <p className="mt-2 text-xs text-ink-500">
            Drop-off orders start in the laundry queue straight away.
          </p>
        </Card>
      </div>
    </div>
  );
}
