"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { pesoPlain, phDateTime, phPhone } from "@/lib/format";
import { UNIT_SHORT, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/status";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Order, OrderItem, Payment } from "@/lib/types";
import type { BusinessSettings } from "@/lib/data";

/**
 * Thermal receipt. 58mm rolls print about 48mm of content and 80mm rolls about
 * 72mm, so the layout is monospaced, single-column and free of anything that
 * depends on colour or background printing.
 */
export function ReceiptView({
  order, items, payments, business,
}: {
  order: Order; items: OrderItem[]; payments: Payment[]; business: BusinessSettings;
}) {
  const [width, setWidth] = useState<"58" | "80">("80");
  const balance = Number(order.total_amount) - Number(order.amount_paid);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 no-print">
        <span className="text-sm font-medium text-ink-700">Paper width</span>
        <div className="flex rounded-lg border border-ink-200 bg-white p-0.5">
          {(["58", "80"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                width === w ? "bg-accent-600 text-white" : "text-ink-600 hover:bg-ink-50",
              )}
            >
              {w}mm
            </button>
          ))}
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Print
        </Button>
      </div>

      <div
        className={cn(
          "receipt mx-auto bg-white p-3 font-mono text-black",
          "border border-ink-200 print:border-0",
          width === "58" ? "w-[48mm] text-[9px] leading-[1.35]"
                         : "w-[72mm] text-[10px] leading-[1.4]",
        )}
      >
        <div className="text-center">
          <p className="text-[1.25em] font-bold uppercase tracking-wide">{business.name}</p>
          <p className="mt-0.5 whitespace-pre-line">{business.address}</p>
          <p>{business.phone}</p>
        </div>

        <Divider />

        <Line label="Order" value={order.order_number} />
        <Line label="Date" value={phDateTime(order.placed_at)} />
        <Line label="Customer" value={order.customer_name} />
        <Line label="Mobile" value={phPhone(order.customer_phone)} />
        <Line
          label="Type"
          value={order.order_type === "pickup_delivery" ? "Pickup & Delivery" : "Drop-off"}
        />
        <Line label="Status" value={ORDER_STATUS_LABEL[order.status]} />

        <Divider />

        {items.map((item) => {
          const qty = Number(item.actual_quantity ?? item.quantity);
          return (
            <div key={item.id} className="mb-1">
              <p className="font-bold">{item.service_name}</p>
              <div className="flex justify-between">
                <span>
                  {qty} {UNIT_SHORT[item.unit]} x {pesoPlain(item.unit_price)}
                </span>
                <span>{pesoPlain(item.line_total)}</span>
              </div>
            </div>
          );
        })}

        <Divider />

        <Line label="Subtotal" value={pesoPlain(order.subtotal)} mono />
        {Number(order.pickup_fee) > 0 && (
          <Line label="Pickup fee" value={pesoPlain(order.pickup_fee)} mono />
        )}
        {Number(order.delivery_fee) > 0 && (
          <Line label="Delivery fee" value={pesoPlain(order.delivery_fee)} mono />
        )}
        {Number(order.additional_charges) > 0 && (
          <Line
            label={order.charges_reason || "Additional"}
            value={pesoPlain(order.additional_charges)} mono
          />
        )}
        {Number(order.discount_amount) > 0 && (
          <Line
            label={order.discount_reason || "Discount"}
            value={`-${pesoPlain(order.discount_amount)}`} mono
          />
        )}

        <Divider />

        <div className="flex justify-between text-[1.2em] font-bold">
          <span>TOTAL</span>
          <span>P {pesoPlain(order.total_amount)}</span>
        </div>

        <Divider />

        {payments.map((p) => (
          <Line
            key={p.id}
            label={`${p.method.replace("_", " ")}${p.reference_number ? ` ${p.reference_number}` : ""}`}
            value={pesoPlain(p.amount)}
            mono
          />
        ))}
        <Line label="Paid" value={pesoPlain(order.amount_paid)} mono />
        <Line
          label={balance > 0 ? "BALANCE DUE" : "Change / Balance"}
          value={pesoPlain(Math.max(0, balance))}
          mono
        />
        <Line label="Payment" value={PAYMENT_STATUS_LABEL[order.payment_status]} />

        {order.notes && (
          <>
            <Divider />
            <p className="font-bold">Notes</p>
            <p className="whitespace-pre-line">{order.notes}</p>
          </>
        )}

        <Divider />

        <div className="text-center">
          <p>Salamat po!</p>
          <p className="mt-0.5">Track your order at</p>
          <p className="font-bold">{business.email}</p>
          <p className="mt-1.5">Items unclaimed after 30 days</p>
          <p>may be disposed of.</p>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <p className="my-1.5 overflow-hidden whitespace-nowrap">{"-".repeat(48)}</p>;
}

function Line({
  label, value, mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0 capitalize">{label}</span>
      <span className={cn("text-right", mono && "tabular-nums")}>{value}</span>
    </div>
  );
}
