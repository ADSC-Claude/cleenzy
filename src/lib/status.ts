import type { OrderStatus, OrderType, ServiceUnit, PaymentStatus, TaskStatus } from "./types";

/**
 * One status enum drives two different views:
 *
 *   Admin Kanban   received → sorting → washing → drying → folding
 *                  → quality_check → packed
 *   Customer view  an 11-step timeline where quality_check and packed both
 *                  read as "Ready", because the customer does not care that
 *                  a bag passed QC — only that it is done.
 *
 * Keeping the mapping here means an admin action can never desync from what
 * the customer sees on the tracking page.
 */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  received: "Received",
  sorting: "Sorting",
  washing: "Washing",
  drying: "Drying",
  folding: "Folding",
  quality_check: "Quality Check",
  packed: "Packed",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Customer-facing timeline steps, in order. */
export const TIMELINE_STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "pickup_scheduled", label: "Pickup Scheduled", pickupOnly: true },
  { key: "picked_up", label: "Picked Up", pickupOnly: true },
  { key: "received", label: "Received" },
  { key: "sorting", label: "Sorting" },
  { key: "washing", label: "Washing" },
  { key: "drying", label: "Drying" },
  { key: "folding", label: "Folding" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery", pickupOnly: true },
  { key: "completed", label: "Completed" },
] as const;

/** Which timeline step a raw status lands on. */
const TIMELINE_INDEX: Record<OrderStatus, number> = {
  placed: 0,
  pickup_scheduled: 1,
  picked_up: 2,
  received: 3,
  sorting: 4,
  washing: 5,
  drying: 6,
  folding: 7,
  quality_check: 7,
  packed: 8,
  ready: 8,
  out_for_delivery: 9,
  completed: 10,
  cancelled: -1,
};

export function timelineIndex(status: OrderStatus): number {
  return TIMELINE_INDEX[status];
}

/**
 * Drop-off orders never get picked up or delivered, so those steps are
 * removed rather than shown as permanently incomplete.
 */
export function timelineFor(orderType: OrderType) {
  return TIMELINE_STEPS.filter(
    (s) => orderType === "pickup_delivery" || !("pickupOnly" in s && s.pickupOnly),
  );
}

/** Progress of a status along the (possibly filtered) timeline, 0..1. */
export function timelineProgress(status: OrderStatus, orderType: OrderType): number {
  const steps = timelineFor(orderType);
  const idx = timelineIndex(status);
  if (idx < 0) return 0;
  const reached = steps.filter((s) => TIMELINE_INDEX[s.key as OrderStatus] <= idx).length;
  return steps.length <= 1 ? 1 : (reached - 1) / (steps.length - 1);
}

/** Kanban columns, in processing order. */
export const QUEUE_COLUMNS: Array<{
  key: OrderStatus; label: string; action: string;
}> = [
  { key: "received",      label: "Received",         action: "Start Sorting" },
  { key: "sorting",       label: "Sorting",          action: "Start Washing" },
  { key: "washing",       label: "Washing",          action: "Start Drying" },
  { key: "drying",        label: "Drying",           action: "Start Folding" },
  { key: "folding",       label: "Folding / Ironing", action: "Quality Check" },
  { key: "quality_check", label: "Quality Check",    action: "Mark Packed" },
  { key: "packed",        label: "Packed",           action: "Mark Ready" },
];

/** The status a queue card moves to when staff tap its action button. */
export function nextQueueStatus(current: OrderStatus): OrderStatus | null {
  const i = QUEUE_COLUMNS.findIndex((c) => c.key === current);
  if (i === -1) return null;
  return i === QUEUE_COLUMNS.length - 1 ? "ready" : QUEUE_COLUMNS[i + 1].key;
}

/** Statuses an admin may set directly, grouped for the status dropdown. */
export const ADMIN_STATUS_GROUPS: Array<{ label: string; statuses: OrderStatus[] }> = [
  { label: "Booking",  statuses: ["placed", "pickup_scheduled", "picked_up"] },
  { label: "Laundry",  statuses: ["received", "sorting", "washing", "drying", "folding", "quality_check", "packed"] },
  { label: "Handover", statuses: ["ready", "out_for_delivery", "completed"] },
  { label: "Closed",   statuses: ["cancelled"] },
];

type Tone = "neutral" | "info" | "progress" | "success" | "danger";

export const STATUS_TONE: Record<OrderStatus, Tone> = {
  placed: "neutral",
  pickup_scheduled: "info",
  picked_up: "info",
  received: "info",
  sorting: "progress",
  washing: "progress",
  drying: "progress",
  folding: "progress",
  quality_check: "progress",
  packed: "progress",
  ready: "success",
  out_for_delivery: "info",
  completed: "success",
  cancelled: "danger",
};

export const TONE_CLASS: Record<Tone, string> = {
  neutral:  "bg-ink-100 text-ink-700",
  info:     "bg-sky-100 text-sky-800",
  progress: "bg-amber-100 text-amber-800",
  success:  "bg-accent-100 text-accent-800",
  danger:   "bg-rose-100 text-rose-800",
};

export const PAYMENT_TONE: Record<PaymentStatus, string> = {
  unpaid:   "bg-rose-100 text-rose-800",
  partial:  "bg-amber-100 text-amber-800",
  paid:     "bg-accent-100 text-accent-800",
  refunded: "bg-ink-100 text-ink-700",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid", partial: "Partial", paid: "Paid", refunded: "Refunded",
};

export const UNIT_LABEL: Record<ServiceUnit, string> = {
  per_kg: "per kg",
  per_piece: "per piece",
  per_pair: "per pair",
  per_load: "per load",
};

export const UNIT_SHORT: Record<ServiceUnit, string> = {
  per_kg: "kg", per_piece: "pc", per_pair: "pair", per_load: "load",
};

export const UNIT_NOUN: Record<ServiceUnit, string> = {
  per_kg: "Estimated weight (kg)",
  per_piece: "Number of pieces",
  per_pair: "Number of pairs",
  per_load: "Number of loads",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  assigned: "Assigned",
  en_route: "On the Way",
  picked_up: "Picked Up",
  delivered: "Delivered",
  failed: "Failed",
};

/** Rider flow differs by leg: a pickup ends at picked_up, a delivery at delivered. */
export function nextTaskStatus(
  current: TaskStatus, type: "pickup" | "delivery",
): TaskStatus | null {
  const flow: TaskStatus[] = type === "pickup"
    ? ["assigned", "en_route", "picked_up"]
    : ["assigned", "en_route", "delivered"];
  const i = flow.indexOf(current);
  return i === -1 || i === flow.length - 1 ? null : flow[i + 1];
}

/** Order status that should follow when a rider completes a leg. */
export function orderStatusForTask(
  type: "pickup" | "delivery", taskStatus: TaskStatus,
): OrderStatus | null {
  if (type === "pickup" && taskStatus === "en_route") return "pickup_scheduled";
  if (type === "pickup" && taskStatus === "picked_up") return "picked_up";
  if (type === "delivery" && taskStatus === "en_route") return "out_for_delivery";
  if (type === "delivery" && taskStatus === "delivered") return "completed";
  return null;
}
