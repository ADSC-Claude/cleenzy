"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Store, Truck } from "lucide-react";
import type { OrderType, PaymentMethod, Service, ServiceArea, TimeSlot } from "@/lib/types";
import { quote, earliestDeliveryDate } from "@/lib/pricing";
import { peso, manilaToday, addDays, isValidPhPhone } from "@/lib/format";
import { UNIT_LABEL, UNIT_SHORT, UNIT_NOUN } from "@/lib/status";
import { Alert, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createBooking, type BookingInput } from "./actions";
import type { PaymentSettings } from "@/lib/data";

/**
 * One simple client form — no account, no steps. Name, phone, what to wash,
 * when, where, how to pay. The running total stays pinned on mobile.
 */

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "gcash", label: "GCash" },
  { value: "cash", label: "Cash on delivery" },
  { value: "bank_transfer", label: "Bank transfer" },
];

interface Props {
  services: Service[];
  areas: ServiceArea[];
  slots: TimeSlot[];
  payments: PaymentSettings;
  preselectSlug?: string;
  preselectAreaId?: string;
}

export function BookingForm({
  services, areas, slots, payments, preselectSlug, preselectAreaId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const preselected = preselectSlug
    ? services.find((s) => s.slug === preselectSlug)
    : undefined;

  const [quantities, setQuantities] = useState<Record<string, string>>(
    preselected ? { [preselected.id]: String(preselected.min_quantity || 1) } : {},
  );
  const [orderType, setOrderType] = useState<OrderType>("pickup_delivery");
  const [areaId, setAreaId] = useState(
    preselectAreaId && areas.some((a) => a.id === preselectAreaId) ? preselectAreaId : "",
  );
  const [pickupDate, setPickupDate] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gcash");
  const [notes, setNotes] = useState("");

  const isPickup = orderType === "pickup_delivery";
  const area = areas.find((a) => a.id === areaId) ?? null;

  const selections = useMemo(
    () => Object.entries(quantities)
      .map(([serviceId, qty]) => ({ serviceId, quantity: Number(qty) || 0 }))
      .filter((s) => s.quantity > 0),
    [quantities],
  );
  const selectedIds = selections.map((s) => s.serviceId);

  const q = useMemo(
    () => quote({ selections, services, orderType, area }),
    [selections, services, orderType, area],
  );

  const today = manilaToday();
  const minDelivery = pickupDate
    ? earliestDeliveryDate(pickupDate, services, selectedIds)
    : addDays(today, 1);

  function toggleService(svc: Service) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (next[svc.id] !== undefined) delete next[svc.id];
      else next[svc.id] = String(svc.min_quantity || 1);
      return next;
    });
  }

  /** First problem that would stop the booking, or null when ready. */
  function blocker(): string | null {
    if (selections.length === 0) return "Choose at least one service.";
    if (isPickup && areas.length > 0 && !areaId) return "Choose your area so we can compute the pickup fee.";
    if (!pickupDate) return isPickup ? "Choose a pickup date." : "Choose a drop-off date.";
    if (isPickup && !pickupSlot) return "Choose a pickup time slot.";
    if (name.trim().length < 2) return "Enter your name.";
    if (!isValidPhPhone(phone)) return "Enter a valid mobile number, e.g. 0917 555 1234.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
    if (isPickup) {
      if (line1.trim().length < 5) return "Enter your house number and street.";
      if (city.trim().length < 2) return "Enter your city.";
    }
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const blocked = blocker();
    if (blocked) {
      setError(blocked);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(null);

    const payload: BookingInput = {
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim(),
      selections,
      order_type: orderType,
      pickup_date: pickupDate || null,
      pickup_slot_id: isPickup ? (pickupSlot || null) : null,
      delivery_date: (deliveryDate || (pickupDate ? minDelivery : null)) ?? null,
      delivery_slot_id: isPickup ? (deliverySlot || pickupSlot || null) : null,
      service_area_id: isPickup ? (areaId || null) : null,
      address: isPickup ? {
        line1: line1.trim(),
        barangay: barangay.trim(),
        city: city.trim(),
        landmark: landmark.trim(),
      } : null,
      payment_method: paymentMethod,
      notes: notes.trim(),
    };

    startTransition(async () => {
      const result = await createBooking(payload);
      if (result.ok) router.push(`/book/confirmed?order=${encodeURIComponent(result.orderNumber)}`);
      else {
        setError(result.error);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 px-4 pb-44 pt-8 sm:px-6 sm:pb-16">
      {error && <Alert tone="error">{error}</Alert>}

      {/* 1 — Services */}
      <Card>
        <h2 className="font-bold text-ink-900">What are we washing?</h2>
        <p className="mt-1 text-sm text-ink-500">
          Estimates are fine — we weigh everything at the shop and you pay the
          actual weight.
        </p>
        <div className="mt-4 space-y-2">
          {services.map((s) => {
            const on = quantities[s.id] !== undefined;
            const qty = Number(quantities[s.id]) || 0;
            const belowMin = on && qty > 0 && qty < Number(s.min_quantity);
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border p-3.5 transition-colors",
                  on ? "border-accent-500 bg-accent-50/60" : "border-ink-200",
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleService(s)}
                    aria-pressed={on}
                    aria-label={`${on ? "Remove" : "Add"} ${s.name}`}
                    className={cn(
                      "grid h-6 w-6 flex-none place-items-center rounded-lg border-2",
                      on ? "border-accent-600 bg-accent-600 text-white" : "border-ink-300 bg-white",
                    )}
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleService(s)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-semibold text-ink-900">{s.name}</span>
                    <span className="block text-xs text-ink-500">
                      {peso(s.price)} {UNIT_LABEL[s.unit]}
                    </span>
                  </button>
                  {on && (
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={s.unit === "per_kg" ? 0.5 : 1}
                      aria-label={UNIT_NOUN[s.unit]}
                      value={quantities[s.id] ?? ""}
                      onChange={(e) =>
                        setQuantities((p) => ({ ...p, [s.id]: e.target.value }))
                      }
                      className="h-10 w-20 flex-none text-center"
                    />
                  )}
                  {on && (
                    <span className="w-8 flex-none text-xs text-ink-500">
                      {UNIT_SHORT[s.unit]}
                    </span>
                  )}
                </div>
                {belowMin && (
                  <p className="mt-2 pl-9 text-xs text-amber-700">
                    Minimum {Number(s.min_quantity)} {UNIT_SHORT[s.unit]} — you will
                    be charged for {Number(s.min_quantity)} {UNIT_SHORT[s.unit]}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2 — Schedule */}
      <Card>
        <h2 className="font-bold text-ink-900">Pickup or drop-off?</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {([
            { value: "pickup_delivery" as const, icon: Truck, label: "Pickup & delivery" },
            { value: "dropoff" as const, icon: Store, label: "Drop off at shop" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrderType(opt.value)}
              aria-pressed={orderType === opt.value}
              className={cn(
                "flex items-center justify-center gap-2 rounded-full border px-3 py-3 text-sm font-semibold transition-colors",
                orderType === opt.value
                  ? "border-accent-600 bg-accent-600 text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
              )}
            >
              <opt.icon size={16} /> {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {isPickup && areas.length > 0 && (
            <Field
              label="Your area" required className="sm:col-span-2"
              hint={area
                ? `Pickup ${peso(area.pickup_fee)} · delivery ${peso(area.delivery_fee)}` +
                  (area.free_delivery_over ? ` · free delivery over ${peso(area.free_delivery_over)}` : "")
                : undefined}
            >
              <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">Select your area…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label={isPickup ? "Pickup date" : "Drop-off date"} required>
            <Input
              type="date" min={today} max={addDays(today, 30)}
              value={pickupDate}
              onChange={(e) => { setPickupDate(e.target.value); setDeliveryDate(""); }}
            />
          </Field>
          {isPickup && (
            <Field label="Pickup time" required>
              <Select value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)}>
                <option value="">Select a time slot…</option>
                {slots.filter((s) => s.slot_type !== "delivery").map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field
            label={isPickup ? "Delivery date" : "Collection date"}
            hint={pickupDate ? `Earliest: ${minDelivery}` : "We suggest the earliest date for your services."}
          >
            <Input
              type="date" min={minDelivery} max={addDays(today, 45)}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </Field>
          {isPickup && (
            <Field label="Delivery time" hint="Same as pickup if left blank.">
              <Select value={deliverySlot} onChange={(e) => setDeliverySlot(e.target.value)}>
                <option value="">Same as pickup</option>
                {slots.filter((s) => s.slot_type !== "pickup").map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      {/* 3 — Contact & address */}
      <Card>
        <h2 className="font-bold text-ink-900">Your details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="Maria Santos" autoComplete="name" />
          </Field>
          <Field label="Mobile number" required
                 hint="Order updates go here — it's also how you track your order.">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                   placeholder="0917 555 1234" inputMode="tel" autoComplete="tel" />
          </Field>
          <Field label="Email" hint="Optional, for your confirmation." className="sm:col-span-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="maria@example.com" autoComplete="email" />
          </Field>

          {isPickup && (
            <>
              <Field label="House / unit number and street" required className="sm:col-span-2">
                <Input value={line1} onChange={(e) => setLine1(e.target.value)}
                       placeholder="12B Mabini Street" autoComplete="address-line1" />
              </Field>
              <Field label="Barangay">
                <Input value={barangay} onChange={(e) => setBarangay(e.target.value)}
                       placeholder="Poblacion" />
              </Field>
              <Field label="City" required>
                <Input value={city} onChange={(e) => setCity(e.target.value)}
                       placeholder="Makati City" autoComplete="address-level2" />
              </Field>
              <Field label="Landmark" hint="Helps our rider find you quickly."
                     className="sm:col-span-2">
                <Input value={landmark} onChange={(e) => setLandmark(e.target.value)}
                       placeholder="Beside the blue gate, across the sari-sari store" />
              </Field>
            </>
          )}

          <Field label="Payment method" required>
            <Select value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Notes for our team" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Fabric care, detergent preference, who to hand the bag to…" />
          </Field>
        </div>

        {paymentMethod === "gcash" && (
          <div className="mt-4">
            <Alert tone="info">
              Send your payment to <strong>{payments.gcash_number}</strong> (
              {payments.gcash_name}) with your order number as the reference —
              you get the number right after booking.
            </Alert>
          </div>
        )}
        {paymentMethod === "bank_transfer" && (
          <div className="mt-4">
            <Alert tone="info">
              {payments.bank_name} · {payments.bank_account_name} ·{" "}
              <strong>{payments.bank_account_number}</strong>. Use your order
              number as the reference.
            </Alert>
          </div>
        )}
      </Card>

      {/* Summary + submit — pinned on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:rounded-card sm:border sm:bg-white sm:p-6">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-500">
              {q.lines.length === 0
                ? "No services selected yet"
                : q.lines.map((l) => `${l.name} ${l.billedQuantity}${UNIT_SHORT[l.unit]}`).join(" · ")}
              {isPickup && q.pickupFee + q.deliveryFee > 0 &&
                ` · fees ${peso(q.pickupFee + q.deliveryFee)}`}
              {q.deliveryWaived && " · delivery free"}
            </p>
            <p className="text-lg font-bold text-ink-900">{peso(q.total)}</p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex flex-none items-center gap-2 rounded-full bg-accent-600 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-700 disabled:bg-accent-300"
          >
            {pending
              ? <><Loader2 size={17} className="animate-spin" /> Booking…</>
              : <>Book now <ArrowRight size={17} /></>}
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-2xl text-[11px] text-ink-400">
          Estimated total — we weigh on arrival and you pay the actual weight.
          No account needed.
        </p>
      </div>
    </form>
  );
}
