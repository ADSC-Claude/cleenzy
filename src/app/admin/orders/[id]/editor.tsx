"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2, Plus, Printer, Trash2, Save, Ban, BellRing, Check,
} from "lucide-react";
import {
  changeOrderStatus, updateOrderDetails, updateItemQuantity, addOrderItem,
  removeOrderItem, recordPayment, cancelOrder, sendPaymentReminder,
} from "../../actions";
import {
  ADMIN_STATUS_GROUPS, ORDER_STATUS_LABEL, UNIT_SHORT,
} from "@/lib/status";
import { peso, phDate, phDateTime, phPhone } from "@/lib/format";
import {
  Alert, Button, Card, CardTitle, Field, Input, PaymentBadge, Select,
  StatusBadge, Table, TableWrap, Td, Textarea, Th,
} from "@/components/ui";
import type {
  Address, Order, OrderItem, OrderStatus, Payment, PaymentMethod,
  Profile, Service, StatusHistoryEntry,
} from "@/lib/types";

interface Props {
  order: Order;
  items: OrderItem[];
  payments: Payment[];
  history: StatusHistoryEntry[];
  services: Service[];
  staff: Profile[];
  riders: Profile[];
  pickupAddress: Address | null;
  deliveryAddress: Address | null;
  canSeeFinance: boolean;
}

export function OrderEditor({
  order, items, payments, history, services, staff, riders,
  pickupAddress, deliveryAddress, canSeeFinance,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string) {
    setError(null); setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) { if (done) setNotice(done); }
      else setError(result.error);
    });
  }

  const balance = Number(order.total_amount) - Number(order.amount_paid);

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ------------------------------------------------------- Left col */}
        <div className="space-y-5 lg:col-span-2">
          <ItemsCard
            order={order} items={items} services={services}
            pending={pending} run={run} canSeeFinance={canSeeFinance}
          />

          {canSeeFinance && (
            <ChargesCard order={order} pending={pending} run={run} />
          )}

          {canSeeFinance && (
            <PaymentsCard
              order={order} payments={payments} balance={balance}
              pending={pending} run={run}
            />
          )}

          <Card>
            <CardTitle>Status history</CardTitle>
            <ol className="mt-3 space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-800">
                    {ORDER_STATUS_LABEL[h.to_status]}
                    {h.note && <span className="ml-2 text-xs text-ink-500">{h.note}</span>}
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-500">
                    {phDateTime(h.created_at)}
                  </span>
                </li>
              ))}
              {history.length === 0 && (
                <li className="text-sm text-ink-500">No changes recorded yet.</li>
              )}
            </ol>
          </Card>
        </div>

        {/* ------------------------------------------------------ Right col */}
        <div className="space-y-5">
          <Card>
            <CardTitle>Status</CardTitle>
            <div className="mt-3"><StatusBadge status={order.status} /></div>
            <Field label="Change status" className="mt-4">
              <Select
                value={order.status}
                disabled={pending || order.status === "cancelled"}
                onChange={(e) =>
                  run(() => changeOrderStatus(order.id, e.target.value as OrderStatus),
                      "Status updated. The customer's tracking page now shows it.")
                }
              >
                {ADMIN_STATUS_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.statuses.map((s) => (
                      <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </Card>

          <Card>
            <CardTitle>Customer</CardTitle>
            <p className="mt-3 font-medium text-ink-900">{order.customer_name}</p>
            <p className="text-sm text-ink-600">{phPhone(order.customer_phone)}</p>
            {order.customer_email && (
              <p className="text-sm text-ink-600">{order.customer_email}</p>
            )}
            {!order.customer_id && (
              <p className="mt-2 text-xs text-ink-500">Guest booking (no account)</p>
            )}
          </Card>

          <Card>
            <CardTitle>Schedule</CardTitle>
            <dl className="mt-3 space-y-2 text-sm">
              <Detail label="Type" value={order.order_type === "pickup_delivery" ? "Pickup & delivery" : "Drop-off"} />
              <Detail label="Pickup" value={order.pickup_date ? phDate(order.pickup_date) : "—"} />
              <Detail label="Delivery" value={order.delivery_date ? phDate(order.delivery_date) : "—"} />
            </dl>
            {pickupAddress && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Pickup address
                </p>
                <p className="mt-1 text-sm text-ink-700">
                  {[pickupAddress.line1, pickupAddress.barangay, pickupAddress.city]
                    .filter(Boolean).join(", ")}
                </p>
                {pickupAddress.landmark && (
                  <p className="mt-0.5 text-xs text-ink-500">{pickupAddress.landmark}</p>
                )}
              </div>
            )}
            {deliveryAddress && deliveryAddress.id !== pickupAddress?.id && (
              <div className="mt-3 border-t border-ink-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Delivery address
                </p>
                <p className="mt-1 text-sm text-ink-700">
                  {[deliveryAddress.line1, deliveryAddress.barangay, deliveryAddress.city]
                    .filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </Card>

          {canSeeFinance && (
            <Card>
              <CardTitle>Assignment</CardTitle>
              <Field label="Laundry staff" className="mt-3">
                <Select
                  value={order.assigned_staff_id ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => updateOrderDetails(order.id, {
                      assigned_staff_id: e.target.value || null,
                    }), "Staff assigned.")
                  }
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Rider" className="mt-3">
                <Select
                  value={order.assigned_rider_id ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => updateOrderDetails(order.id, {
                      assigned_rider_id: e.target.value || null,
                    }), "Rider assigned.")
                  }
                >
                  <option value="">Unassigned</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name || r.email}</option>
                  ))}
                </Select>
              </Field>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardTitle>Customer notes</CardTitle>
              <p className="mt-2 text-sm text-ink-700">{order.notes}</p>
            </Card>
          )}

          {canSeeFinance && (
            <InternalNotesCard order={order} pending={pending} run={run} />
          )}

          <Card>
            <CardTitle>Actions</CardTitle>
            <div className="mt-3 space-y-2">
              <Link href={`/admin/orders/${order.id}/receipt`} target="_blank" className="block">
                <Button variant="secondary" className="w-full">
                  <Printer size={16} /> Print receipt
                </Button>
              </Link>
              {canSeeFinance && balance > 0 && (
                <Button
                  variant="secondary" className="w-full" disabled={pending}
                  onClick={() => run(() => sendPaymentReminder(order.id),
                                     "Payment reminder sent.")}
                >
                  <BellRing size={16} /> Send payment reminder
                </Button>
              )}
              {canSeeFinance && order.status !== "cancelled" && (
                <CancelButton order={order} pending={pending} run={run} />
              )}
            </div>
            {order.status === "cancelled" && order.cancel_reason && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
                Cancelled: {order.cancel_reason}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Sub-cards */

type Runner = (
  fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string,
) => void;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function ItemsCard({
  order, items, services, pending, run, canSeeFinance,
}: {
  order: Order; items: OrderItem[]; services: Service[];
  pending: boolean; run: Runner; canSeeFinance: boolean;
}) {
  const [newService, setNewService] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [weights, setWeights] = useState<Record<string, string>>({});

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Services</CardTitle>
        {order.actual_weight_kg != null && (
          <span className="text-xs text-ink-500">
            Recorded weight {order.actual_weight_kg} kg
          </span>
        )}
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Service</Th><Th>Booked</Th><Th>Actual</Th>
              {canSeeFinance && <Th className="text-right">Total</Th>}
              {canSeeFinance && <Th />}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <span className="font-medium text-ink-900">{item.service_name}</span>
                  {canSeeFinance && (
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {peso(item.unit_price)} per {UNIT_SHORT[item.unit]}
                    </span>
                  )}
                </Td>
                <Td className="text-ink-600">
                  {Number(item.quantity)} {UNIT_SHORT[item.unit]}
                </Td>
                <Td>
                  {canSeeFinance ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number" min={0} step={item.unit === "per_kg" ? 0.1 : 1}
                        className="h-9 w-24"
                        placeholder={String(item.quantity)}
                        value={weights[item.id] ?? (item.actual_quantity != null ? String(item.actual_quantity) : "")}
                        onChange={(e) => setWeights((p) => ({ ...p, [item.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        disabled={pending}
                        aria-label="Save actual quantity"
                        onClick={() => {
                          const raw = weights[item.id];
                          const value = raw === "" || raw === undefined ? null : Number(raw);
                          run(() => updateItemQuantity(item.id, order.id, value),
                              "Quantity updated and the total recalculated.");
                        }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-ink-600">
                      {item.actual_quantity != null
                        ? `${Number(item.actual_quantity)} ${UNIT_SHORT[item.unit]}` : "—"}
                    </span>
                  )}
                </Td>
                {canSeeFinance && (
                  <Td className="text-right font-medium text-ink-900">
                    {peso(item.line_total)}
                  </Td>
                )}
                {canSeeFinance && (
                  <Td className="text-right">
                    <button
                      type="button"
                      disabled={pending || items.length === 1}
                      title={items.length === 1
                        ? "An order needs at least one service"
                        : "Remove this service"}
                      onClick={() => run(() => removeOrderItem(item.id, order.id),
                                         "Service removed.")}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      {canSeeFinance && (
        <>
          <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4 sm:flex-row">
            <Select
              value={newService} onChange={(e) => setNewService(e.target.value)}
              className="sm:flex-1"
            >
              <option value="">Add a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {peso(s.price)} {UNIT_SHORT[s.unit]}
                </option>
              ))}
            </Select>
            <Input
              type="number" min={0} step={0.5} value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="sm:w-28" placeholder="Qty"
            />
            <Button
              variant="secondary"
              disabled={pending || !newService || !(Number(newQty) > 0)}
              onClick={() => {
                run(() => addOrderItem(order.id, newService, Number(newQty)), "Service added.");
                setNewService(""); setNewQty("1");
              }}
            >
              <Plus size={16} /> Add
            </Button>
          </div>

          <dl className="mt-5 space-y-1.5 border-t border-ink-100 pt-4 text-sm">
            <Detail label="Subtotal" value={peso(order.subtotal)} />
            {Number(order.pickup_fee) > 0 && <Detail label="Pickup fee" value={peso(order.pickup_fee)} />}
            {Number(order.delivery_fee) > 0 && <Detail label="Delivery fee" value={peso(order.delivery_fee)} />}
            {Number(order.additional_charges) > 0 && (
              <Detail
                label={order.charges_reason || "Additional charges"}
                value={peso(order.additional_charges)}
              />
            )}
            {Number(order.discount_amount) > 0 && (
              <Detail
                label={order.discount_reason || "Discount"}
                value={`− ${peso(order.discount_amount)}`}
              />
            )}
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base">
              <dt className="font-semibold text-ink-900">Total</dt>
              <dd className="font-semibold text-ink-900">{peso(order.total_amount)}</dd>
            </div>
          </dl>
        </>
      )}
    </Card>
  );
}

function ChargesCard({
  order, pending, run,
}: { order: Order; pending: boolean; run: Runner }) {
  const [weight, setWeight] = useState(
    order.actual_weight_kg != null ? String(order.actual_weight_kg) : "",
  );
  const [charges, setCharges] = useState(String(order.additional_charges ?? 0));
  const [chargesReason, setChargesReason] = useState(order.charges_reason ?? "");
  const [discount, setDiscount] = useState(String(order.discount_amount ?? 0));
  const [discountReason, setDiscountReason] = useState(order.discount_reason ?? "");

  return (
    <Card>
      <CardTitle>Weight, charges & discounts</CardTitle>
      <p className="mt-1 text-xs text-ink-500">
        Recording a weight here is for your records. To change what the customer
        pays, update the actual quantity on the service line above — the total
        recalculates from the line items.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Recorded total weight (kg)">
          <Input
            type="number" min={0} step={0.1} value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <div />
        <Field label="Additional charges">
          <Input type="number" min={0} step={1} value={charges}
                 onChange={(e) => setCharges(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Input value={chargesReason} onChange={(e) => setChargesReason(e.target.value)}
                 placeholder="Heavy stain treatment" />
        </Field>
        <Field label="Discount">
          <Input type="number" min={0} step={1} value={discount}
                 onChange={(e) => setDiscount(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
                 placeholder="Loyal customer" />
        </Field>
      </div>

      <Button
        className="mt-4" disabled={pending}
        onClick={() =>
          run(() => updateOrderDetails(order.id, {
            actual_weight_kg: weight === "" ? null : Number(weight),
            additional_charges: Number(charges) || 0,
            charges_reason: chargesReason.trim() || null,
            discount_amount: Number(discount) || 0,
            discount_reason: discountReason.trim() || null,
          }), "Saved and the total recalculated.")
        }
      >
        {pending ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                 : <><Save size={16} /> Save adjustments</>}
      </Button>
    </Card>
  );
}

function PaymentsCard({
  order, payments, balance, pending, run,
}: {
  order: Order; payments: Payment[]; balance: number;
  pending: boolean; run: Runner;
}) {
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [method, setMethod] = useState<PaymentMethod>(order.payment_method);
  const [reference, setReference] = useState("");

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Payments</CardTitle>
        <PaymentBadge status={order.payment_status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-ink-600">Total <strong className="text-ink-900">{peso(order.total_amount)}</strong></span>
        <span className="text-ink-600">Paid <strong className="text-ink-900">{peso(order.amount_paid)}</strong></span>
        <span className={balance > 0 ? "text-amber-700" : "text-accent-700"}>
          Balance <strong>{peso(Math.max(0, balance))}</strong>
        </span>
      </div>

      {payments.length > 0 && (
        <TableWrap>
          <Table>
            <thead>
              <tr><Th>Date</Th><Th>Method</Th><Th>Reference</Th><Th className="text-right">Amount</Th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td className="text-xs text-ink-600">{phDateTime(p.paid_at)}</Td>
                  <Td className="text-xs capitalize text-ink-700">{p.method.replace("_", " ")}</Td>
                  <Td className="font-mono text-xs text-ink-600">{p.reference_number ?? "—"}</Td>
                  <Td className="text-right font-medium text-ink-900">{peso(p.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {order.status !== "cancelled" && (
        <div className="mt-4 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Amount">
            <Input type="number" min={0} step={1} value={amount}
                   onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)}
                   placeholder="GCash ref" />
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full sm:w-auto"
              disabled={pending || !(Number(amount) > 0)}
              onClick={() => {
                run(() => recordPayment(order.id, Number(amount), method, reference),
                    "Payment recorded.");
                setReference("");
              }}
            >
              Record
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function InternalNotesCard({
  order, pending, run,
}: { order: Order; pending: boolean; run: Runner }) {
  const [notes, setNotes] = useState(order.internal_notes ?? "");
  return (
    <Card>
      <CardTitle>Internal notes</CardTitle>
      <p className="mt-1 text-xs text-ink-500">Only staff can see this.</p>
      <Textarea
        className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything the team should know about this order."
      />
      <Button
        variant="secondary" size="sm" className="mt-3" disabled={pending}
        onClick={() => run(() => updateOrderDetails(order.id, {
          internal_notes: notes.trim() || null,
        }), "Notes saved.")}
      >
        <Save size={15} /> Save notes
      </Button>
    </Card>
  );
}

function CancelButton({
  order, pending, run,
}: { order: Order; pending: boolean; run: Runner }) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  if (!confirming) {
    return (
      <Button variant="secondary" className="w-full text-rose-700"
              onClick={() => setConfirming(true)}>
        <Ban size={16} /> Cancel order
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
      <p className="text-sm font-medium text-rose-900">Cancel this order?</p>
      <Input
        className="mt-2" value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
      />
      <div className="mt-2 flex gap-2">
        <Button
          variant="danger" size="sm" disabled={pending || !reason.trim()}
          onClick={() => run(() => cancelOrder(order.id, reason), "Order cancelled.")}
        >
          Confirm
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
