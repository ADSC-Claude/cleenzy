"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronLeft, ChevronRight, Truck, Store,
  Wallet, Smartphone, Landmark, CreditCard, Loader2,
} from "lucide-react";
import type { Service, ServiceArea, TimeSlot, Address, OrderType, PaymentMethod } from "@/lib/types";
import { quote, earliestDeliveryDate } from "@/lib/pricing";
import { peso, manilaToday, addDays, phDayLabel, isValidPhPhone } from "@/lib/format";
import { UNIT_LABEL, UNIT_SHORT, UNIT_NOUN } from "@/lib/status";
import { Button, Card, Field, Input, Select, Textarea, Alert } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createBooking, type BookingInput } from "./actions";
import type { PaymentSettings } from "@/lib/data";

type StepKey =
  | "services" | "quantity" | "type" | "pickup"
  | "delivery" | "details" | "payment" | "review";

const STEP_TITLES: Record<StepKey, string> = {
  services: "Choose your services",
  quantity: "How much laundry?",
  type: "Pickup or drop-off?",
  pickup: "Pickup schedule",
  delivery: "Delivery schedule",
  details: "Your details",
  payment: "Payment method",
  review: "Review & confirm",
};

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod; label: string; hint: string; icon: typeof Wallet;
}> = [
  { value: "gcash", label: "GCash", hint: "Send to our GCash number after booking", icon: Smartphone },
  { value: "cash", label: "Cash on delivery", hint: "Pay the rider when your laundry arrives", icon: Wallet },
  { value: "bank_transfer", label: "Bank transfer", hint: "We will send the account details", icon: Landmark },
  { value: "card", label: "Card", hint: "Coming soon", icon: CreditCard },
];

interface Props {
  services: Service[];
  areas: ServiceArea[];
  slots: TimeSlot[];
  savedAddresses: Address[];
  payments: PaymentSettings;
  signedInName: string;
  signedInPhone: string;
  signedInEmail: string;
  preselectSlug?: string;
  preselectAreaId?: string;
}

export function BookingWizard({
  services, areas, slots, savedAddresses, payments,
  signedInName, signedInPhone, signedInEmail, preselectSlug, preselectAreaId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const preselected = preselectSlug
    ? services.find((s) => s.slug === preselectSlug)
    : undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, string>>(
    preselected ? { [preselected.id]: String(preselected.min_quantity || 1) } : {},
  );
  const [orderType, setOrderType] = useState<OrderType>("pickup_delivery");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [areaId, setAreaId] = useState(
    // Carried over from the landing page's "Book a Pickup" card.
    preselectAreaId && areas.some((a) => a.id === preselectAreaId)
      ? preselectAreaId
      : "",
  );
  const [savedAddressId, setSavedAddressId] = useState("");
  const [name, setName] = useState(signedInName);
  const [phone, setPhone] = useState(signedInPhone);
  const [email, setEmail] = useState(signedInEmail);
  const [addr, setAddr] = useState({
    label: "Home", line1: "", barangay: "", city: "", province: "", landmark: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gcash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPickup = orderType === "pickup_delivery";

  const steps: StepKey[] = [
    "services", "quantity", "type", "pickup", "delivery",
    "details", "payment", "review",
  ];
  const step = steps[stepIndex];

  const selections = useMemo(
    () => Object.entries(quantities)
      .map(([serviceId, qty]) => ({ serviceId, quantity: Number(qty) || 0 }))
      .filter((s) => s.quantity > 0),
    [quantities],
  );
  const selectedIds = selections.map((s) => s.serviceId);
  const area = areas.find((a) => a.id === areaId) ?? null;

  const q = useMemo(
    () => quote({ selections, services, orderType, area }),
    [selections, services, orderType, area],
  );

  const today = manilaToday();
  const maxDate = addDays(today, 30);
  const minDelivery = pickupDate
    ? earliestDeliveryDate(pickupDate, services, selectedIds)
    : addDays(today, 1);

  const pickupSlots = slots.filter((s) => s.slot_type !== "delivery");
  const deliverySlots = slots.filter((s) => s.slot_type !== "pickup");

  function toggleService(svc: Service) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (next[svc.id]) delete next[svc.id];
      else next[svc.id] = String(svc.min_quantity || 1);
      return next;
    });
  }

  /** Why the Continue button is disabled at this step, or null if it is fine. */
  function blocker(): string | null {
    switch (step) {
      case "services":
        return selectedIds.length === 0 ? "Choose at least one service to continue." : null;
      case "quantity":
        return selections.some((s) => s.quantity <= 0)
          ? "Enter a quantity for each service." : null;
      case "type":
        return isPickup && !areaId ? "Choose the area we should collect from." : null;
      case "pickup":
        if (!pickupDate) return isPickup ? "Choose a pickup date." : "Choose a drop-off date.";
        if (isPickup && !pickupSlot) return "Choose a pickup time slot.";
        return null;
      case "delivery":
        if (!deliveryDate) return isPickup ? "Choose a delivery date." : "Choose a collection date.";
        if (isPickup && !deliverySlot) return "Choose a delivery time slot.";
        return null;
      case "details": {
        if (name.trim().length < 2) return "Enter your name.";
        if (!isValidPhPhone(phone)) return "Enter a valid mobile number, e.g. 0917 555 1234.";
        if (email && !/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
        if (isPickup && !savedAddressId) {
          if (addr.line1.trim().length < 5) return "Enter your house number and street.";
          if (addr.city.trim().length < 2) return "Enter your city.";
        }
        return null;
      }
      case "payment":
        return paymentMethod === "card" && !payments.card_enabled
          ? "Card payments are not enabled yet — please choose another method." : null;
      default:
        return null;
    }
  }

  const blocked = blocker();

  function next() {
    if (blocked) { setError(blocked); return; }
    setError(null);
    // Pre-fill a sensible delivery date the first time the customer reaches
    // that step, so the common case is one tap instead of a date picker.
    if (step === "pickup" && !deliveryDate && pickupDate) {
      setDeliveryDate(earliestDeliveryDate(pickupDate, services, selectedIds));
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    setError(null);
    const payload: BookingInput = {
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim(),
      selections,
      order_type: orderType,
      pickup_date: pickupDate || null,
      pickup_slot_id: isPickup ? (pickupSlot || null) : null,
      delivery_date: deliveryDate || null,
      delivery_slot_id: isPickup ? (deliverySlot || null) : null,
      service_area_id: isPickup ? (areaId || null) : null,
      saved_address_id: isPickup && savedAddressId ? savedAddressId : null,
      address: isPickup && !savedAddressId ? {
        label: addr.label || "Home",
        recipient_name: name.trim(),
        phone: phone.trim(),
        line1: addr.line1.trim(),
        barangay: addr.barangay.trim(),
        city: addr.city.trim(),
        province: addr.province.trim(),
        landmark: addr.landmark.trim(),
        service_area_id: areaId || null,
      } : null,
      payment_method: paymentMethod,
      notes: notes.trim(),
    };

    startTransition(async () => {
      const result = await createBooking(payload);
      if (result.ok) router.push(`/book/confirmed?order=${encodeURIComponent(result.orderNumber)}`);
      else setError(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-8 sm:px-6 sm:pb-16">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-ink-900">{STEP_TITLES[step]}</p>
          <p className="text-ink-500">Step {stepIndex + 1} of {steps.length}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-accent-600 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {error && <div className="mb-5"><Alert tone="error">{error}</Alert></div>}

      {/* ---------------------------------------------------------- Services */}
      {step === "services" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            Pick everything you need — you can combine services in one order.
          </p>
          {services.map((s) => {
            const on = Boolean(quantities[s.id]);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors",
                  on
                    ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                    : "border-ink-200 bg-white hover:border-ink-300",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
                    on ? "border-accent-600 bg-accent-600 text-white" : "border-ink-300 bg-white",
                  )}
                >
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium text-ink-900">{s.name}</span>
                    <span className="text-sm font-semibold text-ink-900">
                      {peso(s.price)}
                      <span className="ml-1 text-xs font-normal text-ink-500">
                        {UNIT_LABEL[s.unit]}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-600">
                    {s.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------- Quantity */}
      {step === "quantity" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            An estimate is fine — we weigh everything at the shop and update your
            order to the actual weight before charging you.
          </p>
          {selectedIds.map((id) => {
            const s = services.find((x) => x.id === id)!;
            const qty = Number(quantities[id]) || 0;
            const belowMin = qty > 0 && qty < Number(s.min_quantity);
            return (
              <Card key={id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-ink-900">{s.name}</p>
                  <p className="text-sm text-ink-500">
                    {peso(s.price)} {UNIT_LABEL[s.unit]}
                  </p>
                </div>
                <Field label={UNIT_NOUN[s.unit]} className="mt-3">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={s.unit === "per_kg" ? 0.5 : 1}
                    value={quantities[id] ?? ""}
                    onChange={(e) =>
                      setQuantities((p) => ({ ...p, [id]: e.target.value }))
                    }
                  />
                </Field>
                {belowMin && (
                  <p className="mt-2 text-xs text-amber-700">
                    Minimum is {Number(s.min_quantity)} {UNIT_SHORT[s.unit]} — you
                    will be charged for {Number(s.min_quantity)} {UNIT_SHORT[s.unit]}.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------------- Order type */}
      {step === "type" && (
        <div className="space-y-3">
          {([
            { value: "pickup_delivery" as const, icon: Truck, title: "Pickup & delivery",
              body: "We collect from your address and bring it back clean." },
            { value: "dropoff" as const, icon: Store, title: "Drop off at the shop",
              body: "Bring your laundry to us and collect it yourself. No pickup fee." },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrderType(opt.value)}
              aria-pressed={orderType === opt.value}
              className={cn(
                "flex w-full items-start gap-4 rounded-card border p-4 text-left transition-colors",
                orderType === opt.value
                  ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                  : "border-ink-200 bg-white hover:border-ink-300",
              )}
            >
              <opt.icon size={22} className="mt-0.5 shrink-0 text-accent-600" />
              <span>
                <span className="block font-medium text-ink-900">{opt.title}</span>
                <span className="mt-0.5 block text-sm text-ink-600">{opt.body}</span>
              </span>
            </button>
          ))}

          {isPickup && (
            <Card className="mt-4">
              <Field
                label="Which area are we collecting from?"
                required
                hint={
                  area
                    ? `Pickup ${peso(area.pickup_fee)} · delivery ${peso(area.delivery_fee)}` +
                      (area.free_delivery_over
                        ? ` · free delivery over ${peso(area.free_delivery_over)}`
                        : "")
                    : "Fees and minimum order depend on your area."
                }
              >
                <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                  <option value="">Select your area…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
                  ))}
                </Select>
              </Field>
              {areas.length === 0 && (
                <p className="mt-2 text-xs text-ink-500">
                  No coverage areas are configured yet. Drop-off is still available.
                </p>
              )}
              {area && q.belowMinimumOrder && (
                <p className="mt-3 text-xs text-amber-700">
                  This area has a {peso(area.min_order_amount)} minimum for pickup.
                  Your order is currently {peso(q.subtotal)}.
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ Pickup */}
      {step === "pickup" && (
        <Card className="space-y-4">
          <Field label={isPickup ? "Pickup date" : "Drop-off date"} required>
            <Input
              type="date"
              min={today}
              max={maxDate}
              value={pickupDate}
              onChange={(e) => { setPickupDate(e.target.value); setDeliveryDate(""); }}
            />
          </Field>
          {isPickup && (
            <Field label="Pickup time slot" required>
              <div className="grid gap-2 sm:grid-cols-2">
                {pickupSlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPickupSlot(s.id)}
                    aria-pressed={pickupSlot === s.id}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                      pickupSlot === s.id
                        ? "border-accent-500 bg-accent-50 text-accent-800 ring-1 ring-accent-500"
                        : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {!isPickup && (
            <p className="text-sm text-ink-600">
              Bring your laundry to the shop on this date and we will start it
              the same day.
            </p>
          )}
        </Card>
      )}

      {/* ---------------------------------------------------------- Delivery */}
      {step === "delivery" && (
        <Card className="space-y-4">
          <p className="text-sm text-ink-600">
            The earliest we can have this ready is{" "}
            <strong className="text-ink-900">{phDayLabel(minDelivery)}</strong>,
            based on the services you chose.
          </p>
          <Field label={isPickup ? "Delivery date" : "Collection date"} required>
            <Input
              type="date"
              min={minDelivery}
              max={addDays(today, 45)}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </Field>
          {isPickup && (
            <Field label="Delivery time slot" required>
              <div className="grid gap-2 sm:grid-cols-2">
                {deliverySlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDeliverySlot(s.id)}
                    aria-pressed={deliverySlot === s.id}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                      deliverySlot === s.id
                        ? "border-accent-500 bg-accent-50 text-accent-800 ring-1 ring-accent-500"
                        : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </Card>
      )}

      {/* ----------------------------------------------------------- Details */}
      {step === "details" && (
        <div className="space-y-5">
          <Card className="space-y-4">
            <h2 className="font-semibold text-ink-900">Contact details</h2>
            <Field label="Full name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="Maria Santos" autoComplete="name" />
            </Field>
            <Field label="Mobile number" required
                   hint="We send order updates here — this is also how you track your order.">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                     placeholder="0917 555 1234" inputMode="tel" autoComplete="tel" />
            </Field>
            <Field label="Email" hint="Optional, for your confirmation and receipt.">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="maria@example.com" autoComplete="email" />
            </Field>
          </Card>

          {isPickup && (
            <Card className="space-y-4">
              <h2 className="font-semibold text-ink-900">Pickup & delivery address</h2>

              {savedAddresses.length > 0 && (
                <Field label="Use a saved address">
                  <Select
                    value={savedAddressId}
                    onChange={(e) => setSavedAddressId(e.target.value)}
                  >
                    <option value="">Enter a new address…</option>
                    {savedAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — {a.line1}, {a.city}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {!savedAddressId && (
                <>
                  <Field label="Label">
                    <Select value={addr.label}
                            onChange={(e) => setAddr({ ...addr, label: e.target.value })}>
                      <option>Home</option><option>Office</option><option>Other</option>
                    </Select>
                  </Field>
                  <Field label="House / unit number and street" required>
                    <Input value={addr.line1}
                           onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
                           placeholder="12B Mabini Street" autoComplete="address-line1" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Barangay">
                      <Input value={addr.barangay}
                             onChange={(e) => setAddr({ ...addr, barangay: e.target.value })}
                             placeholder="Poblacion" />
                    </Field>
                    <Field label="City" required>
                      <Input value={addr.city}
                             onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                             placeholder="Makati City" autoComplete="address-level2" />
                    </Field>
                  </div>
                  <Field label="Landmark"
                         hint="Anything that helps our rider find you quickly.">
                    <Input value={addr.landmark}
                           onChange={(e) => setAddr({ ...addr, landmark: e.target.value })}
                           placeholder="Beside the blue gate, across the sari-sari store" />
                  </Field>
                </>
              )}
            </Card>
          )}

          <Card>
            <Field label="Notes for our team"
                   hint="Fabric care, detergent preference, who to hand the bag to…">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Please use unscented detergent." />
            </Field>
          </Card>
        </div>
      )}

      {/* ----------------------------------------------------------- Payment */}
      {step === "payment" && (
        <div className="space-y-3">
          {PAYMENT_OPTIONS.map((opt) => {
            const disabled = opt.value === "card" && !payments.card_enabled;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setPaymentMethod(opt.value)}
                aria-pressed={paymentMethod === opt.value}
                className={cn(
                  "flex w-full items-center gap-4 rounded-card border p-4 text-left transition-colors",
                  disabled && "cursor-not-allowed opacity-50",
                  paymentMethod === opt.value && !disabled
                    ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                    : "border-ink-200 bg-white hover:border-ink-300",
                )}
              >
                <opt.icon size={22} className="shrink-0 text-accent-600" />
                <span className="flex-1">
                  <span className="block font-medium text-ink-900">{opt.label}</span>
                  <span className="mt-0.5 block text-sm text-ink-600">
                    {disabled ? "Coming soon" : opt.hint}
                  </span>
                </span>
              </button>
            );
          })}

          {paymentMethod === "gcash" && (
            <Alert tone="info">
              Send {peso(q.total)} to <strong>{payments.gcash_number}</strong> (
              {payments.gcash_name}) and use your order number as the reference.
              We will confirm once received.
            </Alert>
          )}
          {paymentMethod === "bank_transfer" && (
            <Alert tone="info">
              {payments.bank_name} · {payments.bank_account_name} ·{" "}
              <strong>{payments.bank_account_number}</strong>. Use your order
              number as the reference.
            </Alert>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ Review */}
      {step === "review" && (
        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-ink-900">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {q.lines.map((l) => (
                <li key={l.serviceId} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium text-ink-900">{l.name}</span>
                    <span className="block text-xs text-ink-500">
                      {l.billedQuantity} {UNIT_SHORT[l.unit]} × {peso(l.unitPrice)}
                      {l.belowMinimum && " (minimum applied)"}
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-medium text-ink-900">
                    {peso(l.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="text-ink-900">{peso(q.subtotal)}</dd>
              </div>
              {isPickup && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-ink-600">Pickup fee</dt>
                    <dd className="text-ink-900">{peso(q.pickupFee)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-600">
                      Delivery fee{q.deliveryWaived && " (waived)"}
                    </dt>
                    <dd className={cn("text-ink-900", q.deliveryWaived && "text-accent-700")}>
                      {q.deliveryWaived ? "Free" : peso(q.deliveryFee)}
                    </dd>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-semibold text-ink-900">Estimated total</dt>
                <dd className="font-semibold text-ink-900">{peso(q.total)}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-ink-500">
              This is an estimate based on the quantities you entered. We weigh
              your laundry on arrival and your final total is adjusted to match.
            </p>
          </Card>

          <Card className="space-y-3 text-sm">
            <h2 className="font-semibold text-ink-900">Schedule & details</h2>
            <Row label="Order type" value={isPickup ? "Pickup & delivery" : "Drop off at shop"} />
            {isPickup && area && <Row label="Area" value={`${area.name}, ${area.city}`} />}
            <Row
              label={isPickup ? "Pickup" : "Drop-off"}
              value={
                pickupDate
                  ? `${phDayLabel(pickupDate)}${
                      isPickup && pickupSlot
                        ? `, ${slots.find((s) => s.id === pickupSlot)?.label ?? ""}`
                        : ""
                    }`
                  : "—"
              }
            />
            <Row
              label={isPickup ? "Delivery" : "Collection"}
              value={
                deliveryDate
                  ? `${phDayLabel(deliveryDate)}${
                      isPickup && deliverySlot
                        ? `, ${slots.find((s) => s.id === deliverySlot)?.label ?? ""}`
                        : ""
                    }`
                  : "—"
              }
            />
            <Row label="Name" value={name} />
            <Row label="Mobile" value={phone} />
            {email && <Row label="Email" value={email} />}
            {isPickup && (
              <Row
                label="Address"
                value={
                  savedAddressId
                    ? (() => {
                        const a = savedAddresses.find((x) => x.id === savedAddressId);
                        return a ? `${a.line1}, ${a.city}` : "—";
                      })()
                    : [addr.line1, addr.barangay, addr.city].filter(Boolean).join(", ") || "—"
                }
              />
            )}
            <Row
              label="Payment"
              value={PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label ?? "—"}
            />
            {notes && <Row label="Notes" value={notes} />}
          </Card>
        </div>
      )}

      {/* Sticky action bar — the running total stays visible on small screens */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={back} disabled={pending} type="button">
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}

          <div className="flex-1 text-sm sm:flex-none">
            <p className="text-xs text-ink-500">Estimated total</p>
            <p className="font-semibold text-ink-900">{peso(q.total)}</p>
          </div>

          {step !== "review" ? (
            <Button onClick={next} type="button" className="flex-1 sm:flex-none sm:px-8">
              Continue <ChevronRight size={18} />
            </Button>
          ) : (
            <Button
              onClick={submit}
              type="button"
              disabled={pending}
              className="flex-1 sm:flex-none sm:px-8"
            >
              {pending ? <><Loader2 size={18} className="animate-spin" /> Booking…</>
                       : <>Confirm booking</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-900">{value}</span>
    </div>
  );
}
