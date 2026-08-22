"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2, Scale } from "lucide-react";
import { QUEUE_COLUMNS, nextQueueStatus, ORDER_STATUS_LABEL } from "@/lib/status";
import { phDate } from "@/lib/format";
import { changeOrderStatus } from "../actions";
import { useLiveRefresh } from "@/lib/use-live-refresh";
import { Alert, Card, EmptyState } from "@/components/ui";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface QueueCard {
  id: string;
  order_number: string;
  customer_name: string;
  status: OrderStatus;
  services: string | null;
  estimated_weight_kg: number | null;
  actual_weight_kg: number | null;
  delivery_date: string | null;
  notes: string | null;
}

export function QueueBoard({ cards }: { cards: QueueCard[] }) {
  useLiveRefresh("orders");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function advance(card: QueueCard) {
    const next = nextQueueStatus(card.status);
    if (!next) return;
    setError(null);
    setPendingId(card.id);
    startTransition(async () => {
      const result = await changeOrderStatus(card.id, next);
      if (!result.ok) setError(result.error);
      setPendingId(null);
    });
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        title="Nothing in the laundry right now"
        description="Orders appear here once they are marked as received."
      />
    );
  }

  return (
    <>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {/* Columns scroll sideways on a phone; staff work one column at a time. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-4">
          {QUEUE_COLUMNS.map((col) => {
            const items = cards.filter((c) => c.status === col.key);
            return (
              <section key={col.key} className="w-72 shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink-900">{col.label}</h2>
                  <span className="rounded-full bg-ink-200 px-2 py-0.5 text-xs font-medium text-ink-700">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.length === 0 && (
                    <div className="rounded-card border border-dashed border-ink-200 px-3 py-6 text-center text-xs text-ink-400">
                      Empty
                    </div>
                  )}

                  {items.map((card) => {
                    const busy = pendingId === card.id;
                    const weight = card.actual_weight_kg ?? card.estimated_weight_kg;
                    return (
                      <Card key={card.id} className="p-4">
                        <p className="font-mono text-xs text-ink-500">{card.order_number}</p>
                        <p className="mt-0.5 font-medium text-ink-900">{card.customer_name}</p>

                        {card.services && (
                          <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                            {card.services}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                          {weight != null && (
                            <span className="inline-flex items-center gap-1">
                              <Scale size={12} />
                              {weight} kg
                              {card.actual_weight_kg == null && " (est.)"}
                            </span>
                          )}
                          {card.delivery_date && (
                            <span>Due {phDate(card.delivery_date)}</span>
                          )}
                        </div>

                        {card.notes && (
                          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                            {card.notes}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => advance(card)}
                          disabled={busy}
                          className={cn(
                            "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg",
                            "bg-accent-600 text-sm font-medium text-white transition-colors",
                            "hover:bg-accent-700 disabled:bg-accent-300",
                          )}
                        >
                          {busy ? (
                            <><Loader2 size={16} className="animate-spin" /> Updating…</>
                          ) : (
                            <>{col.action} <ArrowRight size={15} /></>
                          )}
                        </button>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-500">
        Tapping an action moves the order to{" "}
        {ORDER_STATUS_LABEL[nextQueueStatus("received") as OrderStatus].toLowerCase()},
        and so on down the line. Customers see each change on their tracking page.
      </p>
    </>
  );
}
