"use client";

import { useState, useTransition } from "react";
import { Loader2, MapPin, Phone, Navigation, Package, Banknote } from "lucide-react";
import { advanceTask } from "../actions";
import { useLiveRefresh } from "@/lib/use-live-refresh";
import { TASK_STATUS_LABEL, nextTaskStatus } from "@/lib/status";
import { peso, phDate, phPhone } from "@/lib/format";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { TaskStatus, TaskType, PaymentStatus } from "@/lib/types";

export interface RiderTask {
  id: string;
  order_id: string;
  task_type: TaskType;
  status: TaskStatus;
  scheduled_date: string | null;
  cod_amount: number;
  notes: string | null;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  payment_status: PaymentStatus;
  slot_label: string | null;
  line1: string | null;
  barangay: string | null;
  city: string | null;
  landmark: string | null;
}

export function RiderRuns({ tasks }: { tasks: RiderTask[] }) {
  useLiveRefresh("delivery_tasks", 20_000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function advance(task: RiderTask) {
    const next = nextTaskStatus(task.status, task.task_type);
    if (!next) return;
    setError(null); setBusyId(task.id);
    startTransition(async () => {
      const result = await advanceTask(task.id, next);
      if (!result.ok) setError(result.error);
      setBusyId(null);
    });
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No runs assigned"
        description="Pickups and deliveries assigned to you will show up here."
      />
    );
  }

  return (
    <>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="space-y-4">
        {tasks.map((task) => {
          const next = nextTaskStatus(task.status, task.task_type);
          const busy = busyId === task.id;
          const address = [task.line1, task.barangay, task.city].filter(Boolean).join(", ");
          const collect = task.task_type === "delivery" && task.payment_status !== "paid"
            ? task.cod_amount : 0;

          return (
            <Card key={task.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge
                    className={
                      task.task_type === "pickup"
                        ? "bg-sky-100 text-sky-800" : "bg-accent-100 text-accent-800"
                    }
                  >
                    {task.task_type === "pickup" ? "Pickup" : "Delivery"}
                  </Badge>
                  <p className="mt-2 font-mono text-xs text-ink-500">{task.order_number}</p>
                  <p className="text-lg font-semibold text-ink-900">{task.customer_name}</p>
                </div>
                <div className="text-right text-xs text-ink-500">
                  {task.scheduled_date && <p>{phDate(task.scheduled_date)}</p>}
                  {task.slot_label && <p className="mt-0.5">{task.slot_label}</p>}
                  <Badge className="mt-1.5 bg-ink-100 text-ink-700">
                    {TASK_STATUS_LABEL[task.status]}
                  </Badge>
                </div>
              </div>

              {address && (
                <p className="mt-3 flex items-start gap-2 text-sm text-ink-700">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-ink-400" />
                  <span>
                    {address}
                    {task.landmark && (
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {task.landmark}
                      </span>
                    )}
                  </span>
                </p>
              )}

              {task.notes && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {task.notes}
                </p>
              )}

              {collect > 0 && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-900">
                  <Banknote size={17} /> Collect {peso(collect)}
                </p>
              )}

              {/* Big tap targets: riders use this one-handed, often outdoors. */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${task.customer_phone}`}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  <Phone size={16} /> {phPhone(task.customer_phone)}
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-lg border border-ink-200",
                    "bg-white text-sm font-medium text-ink-800 hover:bg-ink-50",
                    !address && "pointer-events-none opacity-40",
                  )}
                >
                  <Navigation size={16} /> Directions
                </a>
              </div>

              {next && (
                <button
                  type="button"
                  onClick={() => advance(task)}
                  disabled={busy}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-600 text-sm font-semibold text-white hover:bg-accent-700 disabled:bg-accent-300"
                >
                  {busy ? <><Loader2 size={17} className="animate-spin" /> Updating…</>
                        : <><Package size={17} /> Mark {TASK_STATUS_LABEL[next]}</>}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
