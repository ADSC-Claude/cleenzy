"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { assignRider, advanceTask } from "../actions";
import { useLiveRefresh } from "@/lib/use-live-refresh";
import { TASK_STATUS_LABEL, nextTaskStatus } from "@/lib/status";
import { peso, phDate, phPhone } from "@/lib/format";
import {
  Alert, Button, Card, EmptyState, Select, Table, TableWrap, Td, Th, Badge,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Profile, TaskStatus, TaskType } from "@/lib/types";

export interface TaskRow {
  id: string;
  order_id: string;
  task_type: TaskType;
  status: TaskStatus;
  scheduled_date: string | null;
  rider_id: string | null;
  cod_amount: number;
  notes: string | null;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  area: string;
  slot_label: string | null;
  balance: number;
}

const TASK_TONE: Record<TaskStatus, string> = {
  assigned: "bg-ink-100 text-ink-700",
  en_route: "bg-sky-100 text-sky-800",
  picked_up: "bg-accent-100 text-accent-800",
  delivered: "bg-accent-100 text-accent-800",
  failed: "bg-rose-100 text-rose-800",
};

export function LogisticsQueues({
  pickups, deliveries, riders, initialTab,
}: {
  pickups: TaskRow[]; deliveries: TaskRow[]; riders: Profile[]; initialTab: TaskType;
}) {
  useLiveRefresh("delivery_tasks");
  const [tab, setTab] = useState<TaskType>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const rows = tab === "pickup" ? pickups : deliveries;

  function act(
    id: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setError(null); setBusyId(id);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
      setBusyId(null);
    });
  }

  return (
    <>
      <div className="mb-5 flex rounded-lg border border-ink-200 bg-white p-0.5 sm:w-fit">
        {([
          { key: "pickup" as const, label: `Pickups (${pickups.length})` },
          { key: "delivery" as const, label: `Deliveries (${deliveries.length})` },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === t.key ? "bg-accent-600 text-white" : "text-ink-600 hover:bg-ink-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${tab === "pickup" ? "pickups" : "deliveries"} scheduled`}
          description="Orders appear here once they have a schedule."
        />
      ) : (
        <Card className="p-0 sm:p-0">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th><Th>Customer</Th><Th>Area</Th><Th>When</Th>
                  <Th>Rider</Th><Th>Status</Th>
                  {tab === "delivery" && <Th className="text-right">Collect</Th>}
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const next = nextTaskStatus(row.status, row.task_type);
                  const busy = busyId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-ink-50">
                      <Td>
                        <Link
                          href={`/admin/orders/${row.order_id}`}
                          className="font-mono text-xs font-medium text-accent-700 hover:text-accent-800"
                        >
                          {row.order_number}
                        </Link>
                      </Td>
                      <Td>
                        <span className="font-medium text-ink-900">{row.customer_name}</span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {phPhone(row.customer_phone)}
                        </span>
                      </Td>
                      <Td className="text-xs text-ink-600">{row.area}</Td>
                      <Td className="text-xs text-ink-600">
                        {row.scheduled_date ? phDate(row.scheduled_date) : "—"}
                        {row.slot_label && (
                          <span className="mt-0.5 block text-ink-400">{row.slot_label}</span>
                        )}
                      </Td>
                      <Td>
                        <Select
                          className="h-9 w-40 text-xs"
                          value={row.rider_id ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            act(row.id, () => assignRider(row.id, e.target.value || null))
                          }
                        >
                          <option value="">Unassigned</option>
                          {riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.full_name || r.email}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>
                        <Badge className={TASK_TONE[row.status]}>
                          {TASK_STATUS_LABEL[row.status]}
                        </Badge>
                      </Td>
                      {tab === "delivery" && (
                        <Td className="text-right">
                          {row.balance > 0 ? (
                            <span className="font-medium text-amber-700">
                              {peso(row.balance)}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-400">Paid</span>
                          )}
                        </Td>
                      )}
                      <Td className="text-right">
                        {next && (
                          <Button
                            size="sm" variant="secondary" disabled={busy}
                            onClick={() => act(row.id, () => advanceTask(row.id, next))}
                          >
                            {busy ? <Loader2 size={14} className="animate-spin" />
                                  : TASK_STATUS_LABEL[next]}
                          </Button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
