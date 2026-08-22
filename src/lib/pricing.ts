import type { Service, ServiceArea, OrderType } from "./types";

export interface QuoteLine {
  serviceId: string;
  name: string;
  unit: Service["unit"];
  unitPrice: number;
  quantity: number;
  /** Quantity actually billed, after the service's minimum is applied. */
  billedQuantity: number;
  lineTotal: number;
  belowMinimum: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  pickupFee: number;
  deliveryFee: number;
  deliveryWaived: boolean;
  discount: number;
  total: number;
  belowMinimumOrder: boolean;
  minOrderAmount: number;
}

export interface QuoteInput {
  selections: Array<{ serviceId: string; quantity: number }>;
  services: Service[];
  orderType: OrderType;
  area?: ServiceArea | null;
  discount?: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The single pricing routine. The booking wizard renders it for preview and
 * the server recomputes it on submit — the client's arithmetic is never
 * trusted, only its choices.
 */
export function quote({
  selections, services, orderType, area, discount = 0,
}: QuoteInput): Quote {
  const byId = new Map(services.map((s) => [s.id, s]));

  const lines: QuoteLine[] = [];
  for (const sel of selections) {
    const svc = byId.get(sel.serviceId);
    if (!svc) continue;
    const qty = Number(sel.quantity) || 0;
    if (qty <= 0) continue;

    // Services carry a minimum billable quantity (3kg on wash & fold, say);
    // customers may book less but are charged the minimum.
    const billed = Math.max(qty, Number(svc.min_quantity) || 0);
    lines.push({
      serviceId: svc.id,
      name: svc.name,
      unit: svc.unit,
      unitPrice: Number(svc.price),
      quantity: qty,
      billedQuantity: billed,
      lineTotal: round2(billed * Number(svc.price)),
      belowMinimum: billed > qty,
    });
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const isPickup = orderType === "pickup_delivery";
  const pickupFee = isPickup ? Number(area?.pickup_fee ?? 0) : 0;
  const baseDelivery = isPickup ? Number(area?.delivery_fee ?? 0) : 0;

  const threshold = area?.free_delivery_over ? Number(area.free_delivery_over) : null;
  const deliveryWaived = isPickup && threshold !== null && subtotal >= threshold;
  const deliveryFee = deliveryWaived ? 0 : baseDelivery;

  const safeDiscount = Math.max(0, Number(discount) || 0);
  const total = Math.max(
    0, round2(subtotal + pickupFee + deliveryFee - safeDiscount),
  );

  const minOrderAmount = Number(area?.min_order_amount ?? 0);

  return {
    lines,
    subtotal,
    pickupFee,
    deliveryFee,
    deliveryWaived,
    discount: safeDiscount,
    total,
    belowMinimumOrder: isPickup && minOrderAmount > 0 && subtotal < minOrderAmount,
    minOrderAmount,
  };
}

/**
 * Earliest delivery date given the slowest service selected. Turnaround is
 * measured from pickup, rounded up to whole days.
 */
export function earliestDeliveryDate(
  pickupDate: string, services: Service[], selectedIds: string[],
): string {
  const chosen = services.filter((s) => selectedIds.includes(s.id));
  const hours = chosen.length
    ? Math.max(...chosen.map((s) => Number(s.turnaround_hours) || 24))
    : 24;
  const days = Math.max(1, Math.ceil(hours / 24));
  const [y, m, d] = pickupDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
