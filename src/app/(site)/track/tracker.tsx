"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, RefreshCw, Search, XCircle } from "lucide-react";
import { lookupOrder } from "./actions";
import type { TrackedOrder } from "@/lib/types";
import { timelineFor, timelineIndex, UNIT_SHORT, ORDER_STATUS_LABEL } from "@/lib/status";
import { peso, phDate, phDateTime } from "@/lib/format";
import { Alert, Button, Card, Field, Input, PaymentBadge } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * The tracking page refreshes itself every 20 seconds while an order is still
 * in progress. Supabase Realtime is not usable here: guests are anonymous and
 * RLS deliberately gives anon no read access to orders, so the page re-runs
 * the phone-gated RPC instead. Signed-in customers get live updates on
 * /account, where the session makes Realtime possible.
 */
const POLL_MS = 20_000;

export function Tracker({
  initialOrderNumber = "",
}: { initialOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Kept in a ref so the polling effect does not restart on every keystroke.
  const credentials = useRef({ orderNumber: "", phone: "" });

  const runLookup = useCallback(async (num: string, ph: string, quiet = false) => {
    if (!quiet) setError(null);
    const result = await lookupOrder(num, ph);
    if (result.ok) {
      setOrder(result.order);
      setError(null);
      credentials.current = { orderNumber: num, phone: ph };
      setLastChecked(new Date());
    } else if (!quiet) {
      setOrder(null);
      setError(result.error);
    }
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => { void runLookup(orderNumber, phone); });
  }

  async function refreshNow() {
    const { orderNumber: n, phone: p } = credentials.current;
    if (!n) return;
    setRefreshing(true);
    await runLookup(n, p, true);
    setRefreshing(false);
  }

  const isFinished =
    order?.status === "completed" || order?.status === "cancelled";

  useEffect(() => {
    if (!order || isFinished) return;
    const id = setInterval(() => {
      const { orderNumber: n, phone: p } = credentials.current;
      if (n) void runLookup(n, p, true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [order, isFinished, runLookup]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        Track your order
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        Enter your order number and the mobile number you booked with.
      </p>

      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Order number" required>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="CLZ-20260822-0001"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </Field>
          <Field label="Mobile number" required>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 555 1234"
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <><Loader2 size={18} className="animate-spin" /> Looking up…</>
                     : <><Search size={18} /> Track order</>}
          </Button>
        </form>
      </Card>

      {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

      {order && (
        <div className="mt-6 space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-ink-500">{order.order_number}</p>
                <p className="mt-0.5 text-lg font-semibold text-ink-900">
                  {ORDER_STATUS_LABEL[order.status]}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">
                  Booked {phDateTime(order.placed_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-ink-900">
                  {peso(order.total_amount)}
                </p>
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>

            {order.status === "cancelled" ? (
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <XCircle size={18} /> This order was cancelled.
              </div>
            ) : (
              <Timeline order={order} />
            )}

            <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
              <p className="text-xs text-ink-500">
                {isFinished
                  ? "This order is complete."
                  : lastChecked
                    ? `Updated ${phDateTime(lastChecked)} · refreshes automatically`
                    : "Refreshes automatically"}
              </p>
              <Button
                variant="ghost" size="sm" type="button"
                onClick={refreshNow} disabled={refreshing}
              >
                <RefreshCw size={15} className={cn(refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink-900">What we are cleaning</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-ink-700">
                    {item.service_name}
                    <span className="ml-1.5 text-ink-500">
                      {item.quantity} {UNIT_SHORT[item.unit]}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-ink-900">
                    {peso(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 grid gap-2 border-t border-ink-100 pt-4 text-sm sm:grid-cols-2">
              {order.pickup_date && (
                <div>
                  <dt className="text-ink-500">Pickup</dt>
                  <dd className="font-medium text-ink-900">{phDate(order.pickup_date)}</dd>
                </div>
              )}
              {order.delivery_date && (
                <div>
                  <dt className="text-ink-500">Delivery</dt>
                  <dd className="font-medium text-ink-900">{phDate(order.delivery_date)}</dd>
                </div>
              )}
              {order.actual_weight_kg != null && (
                <div>
                  <dt className="text-ink-500">Weighed at</dt>
                  <dd className="font-medium text-ink-900">{order.actual_weight_kg} kg</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}

function Timeline({ order }: { order: TrackedOrder }) {
  const steps = timelineFor(order.order_type);
  const current = timelineIndex(order.status);

  // When each step was reached, so completed steps can show a timestamp.
  const reachedAt = new Map<string, string>();
  for (const h of order.history ?? []) {
    const idx = timelineIndex(h.to_status);
    const step = steps.find((s) => timelineIndex(s.key) === idx);
    if (step && !reachedAt.has(step.key)) reachedAt.set(step.key, h.created_at);
  }

  return (
    <ol className="mt-6">
      {steps.map((step, i) => {
        const stepIdx = timelineIndex(step.key);
        const done = stepIdx < current;
        const active = stepIdx === current;
        const at = reachedAt.get(step.key);
        const isLast = i === steps.length - 1;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
                  done && "border-accent-600 bg-accent-600 text-white",
                  active && "border-accent-600 bg-white text-accent-700",
                  !done && !active && "border-ink-200 bg-white text-ink-300",
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    "w-0.5 flex-1", done ? "bg-accent-600" : "bg-ink-200",
                  )}
                  style={{ minHeight: "1.75rem" }}
                />
              )}
            </div>

            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  active ? "text-accent-700" : done ? "text-ink-900" : "text-ink-400",
                )}
              >
                {step.label}
                {active && (
                  <span className="ml-2 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-accent-600 align-middle" />
                )}
              </p>
              {at && <p className="mt-0.5 text-xs text-ink-500">{phDateTime(at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
