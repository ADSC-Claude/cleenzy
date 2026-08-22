import "server-only";
import { createAdminClient } from "./supabase/admin";
import { peso, phDate } from "./format";
import type { OrderStatus } from "./types";

/**
 * Notifications are best-effort and must never fail a booking or a status
 * change: every send is wrapped, logged to public.notifications, and its
 * outcome recorded. Email goes out through Resend; SMS through Semaphore, a
 * Philippine gateway that stays dormant until SEMAPHORE_API_KEY is set.
 */

export type TemplateKey =
  | "order_confirmed"
  | "pickup_reminder"
  | "rider_on_the_way"
  | "picked_up"
  | "laundry_received"
  | "laundry_ready"
  | "out_for_delivery"
  | "delivered"
  | "payment_received"
  | "payment_reminder";

export interface NotifyContext {
  orderNumber: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  total?: number;
  amountDue?: number;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  slotLabel?: string | null;
  orderId?: string | null;
}

interface Rendered { subject: string; body: string; sms: string; }

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

const trackLink = (ctx: NotifyContext) =>
  siteUrl() ? `${siteUrl()}/track?order=${encodeURIComponent(ctx.orderNumber)}` : "";

function render(key: TemplateKey, ctx: NotifyContext): Rendered {
  const first = ctx.customerName.split(" ")[0] || "there";
  const link = trackLink(ctx);
  const track = link ? `\n\nTrack your order: ${link}` : "";

  switch (key) {
    case "order_confirmed":
      return {
        subject: `Order ${ctx.orderNumber} confirmed`,
        body:
          `Hi ${first},\n\nWe have received your laundry booking.\n\n` +
          `Order number: ${ctx.orderNumber}\n` +
          (ctx.pickupDate ? `Pickup: ${phDate(ctx.pickupDate)}${ctx.slotLabel ? `, ${ctx.slotLabel}` : ""}\n` : "") +
          (ctx.deliveryDate ? `Delivery: ${phDate(ctx.deliveryDate)}\n` : "") +
          (ctx.total !== undefined ? `Estimated total: ${peso(ctx.total)}\n` : "") +
          `\nWe weigh your laundry on arrival, so the final amount may change to ` +
          `match the actual weight.${track}\n\nSalamat,\nCleenzy`,
        sms:
          `Cleenzy: Order ${ctx.orderNumber} confirmed.` +
          (ctx.pickupDate ? ` Pickup ${phDate(ctx.pickupDate)}${ctx.slotLabel ? ` ${ctx.slotLabel}` : ""}.` : "") +
          (ctx.total !== undefined ? ` Est. ${peso(ctx.total)}.` : "") +
          (link ? ` ${link}` : ""),
      };

    case "pickup_reminder":
      return {
        subject: `Pickup today for ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nJust a reminder that we are collecting your laundry today` +
          `${ctx.slotLabel ? ` between ${ctx.slotLabel}` : ""}.\n\n` +
          `Please have your bag ready.${track}\n\nCleenzy`,
        sms:
          `Cleenzy: We are collecting your laundry today` +
          `${ctx.slotLabel ? ` (${ctx.slotLabel})` : ""}. Order ${ctx.orderNumber}.`,
      };

    case "rider_on_the_way":
      return {
        subject: `Our rider is on the way — ${ctx.orderNumber}`,
        body: `Hi ${first},\n\nOur rider is on the way to collect your laundry.${track}\n\nCleenzy`,
        sms: `Cleenzy: Our rider is on the way for order ${ctx.orderNumber}.`,
      };

    case "picked_up":
      return {
        subject: `Laundry collected — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nWe have collected your laundry and it is on its way to ` +
          `the shop. We will message you once it has been weighed and received.${track}\n\nCleenzy`,
        sms: `Cleenzy: Your laundry for ${ctx.orderNumber} has been collected.`,
      };

    case "laundry_received":
      return {
        subject: `Laundry received — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nYour laundry is at the shop and in the queue.\n` +
          (ctx.total !== undefined ? `\nWeighed total: ${peso(ctx.total)}\n` : "") +
          `${track}\n\nCleenzy`,
        sms:
          `Cleenzy: Laundry received for ${ctx.orderNumber}.` +
          (ctx.total !== undefined ? ` Total ${peso(ctx.total)}.` : ""),
      };

    case "laundry_ready":
      return {
        subject: `Your laundry is ready — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nYour laundry is clean, folded and ready.\n` +
          (ctx.deliveryDate ? `We will deliver it on ${phDate(ctx.deliveryDate)}.\n` : "") +
          `${track}\n\nCleenzy`,
        sms: `Cleenzy: Your laundry for ${ctx.orderNumber} is ready.`,
      };

    case "out_for_delivery":
      return {
        subject: `Out for delivery — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nYour laundry is out for delivery.` +
          (ctx.amountDue ? `\n\nPlease prepare ${peso(ctx.amountDue)} for the rider.` : "") +
          `${track}\n\nCleenzy`,
        sms:
          `Cleenzy: Order ${ctx.orderNumber} is out for delivery.` +
          (ctx.amountDue ? ` Please prepare ${peso(ctx.amountDue)}.` : ""),
      };

    case "delivered":
      return {
        subject: `Delivered — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nYour laundry has been delivered. Thank you for ` +
          `choosing Cleenzy — we hope to see you again soon.\n\nCleenzy`,
        sms: `Cleenzy: Order ${ctx.orderNumber} delivered. Salamat!`,
      };

    case "payment_received":
      return {
        subject: `Payment received — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nWe have received your payment` +
          (ctx.total !== undefined ? ` of ${peso(ctx.total)}` : "") +
          ` for order ${ctx.orderNumber}. Thank you.\n\nCleenzy`,
        sms:
          `Cleenzy: Payment received for ${ctx.orderNumber}` +
          (ctx.total !== undefined ? ` (${peso(ctx.total)})` : "") + ". Salamat!",
      };

    case "payment_reminder":
      return {
        subject: `Payment reminder — ${ctx.orderNumber}`,
        body:
          `Hi ${first},\n\nOrder ${ctx.orderNumber} has an outstanding balance` +
          (ctx.amountDue !== undefined ? ` of ${peso(ctx.amountDue)}` : "") +
          `.\n\nYou can settle it by GCash, bank transfer, or in cash on delivery.\n\nCleenzy`,
        sms:
          `Cleenzy: Order ${ctx.orderNumber} has a balance` +
          (ctx.amountDue !== undefined ? ` of ${peso(ctx.amountDue)}` : "") + ".",
      };
  }
}

async function sendEmail(to: string, subject: string, body: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM ?? "Cleenzy <onboarding@resend.dev>";
  if (!key) {
    console.info(`[cleenzy] email suppressed (no RESEND_API_KEY) → ${to}: ${subject}`);
    return { skipped: true as const };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from, to, subject, text: body });
  if (error) throw new Error(error.message);
  return { skipped: false as const };
}

async function sendSms(to: string, message: string) {
  const key = process.env.SEMAPHORE_API_KEY;
  if (!key) {
    console.info(`[cleenzy] sms suppressed (no SEMAPHORE_API_KEY) → ${to}`);
    return { skipped: true as const };
  }
  const params = new URLSearchParams({
    apikey: key,
    number: to,
    message,
    ...(process.env.SEMAPHORE_SENDER_NAME
      ? { sendername: process.env.SEMAPHORE_SENDER_NAME }
      : {}),
  });
  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Semaphore responded ${res.status}: ${await res.text()}`);
  return { skipped: false as const };
}

/** Critical updates also go by SMS; everything else is email only. */
const SMS_CRITICAL: TemplateKey[] = [
  "order_confirmed", "rider_on_the_way", "out_for_delivery",
  "laundry_ready", "payment_reminder",
];

/**
 * Fire-and-forget. Callers should not await this in a way that blocks the
 * user's response, and must never let it throw.
 */
export async function notify(key: TemplateKey, ctx: NotifyContext): Promise<void> {
  const { subject, body, sms } = render(key, ctx);
  let db: ReturnType<typeof createAdminClient> | null = null;
  try {
    db = createAdminClient();
  } catch {
    console.info("[cleenzy] notification not recorded — service role key missing");
  }

  const record = async (
    channel: "email" | "sms", to: string,
    status: "sent" | "failed" | "skipped", error?: string,
  ) => {
    if (!db) return;
    try {
      await db.from("notifications").insert({
        order_id: ctx.orderId ?? null,
        channel, template_key: key, to_address: to, status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
        error: error ?? null,
        payload: { subject },
      });
    } catch (e) {
      console.error("[cleenzy] could not record notification:", e);
    }
  };

  if (ctx.email) {
    try {
      const r = await sendEmail(ctx.email, subject, body);
      await record("email", ctx.email, r.skipped ? "skipped" : "sent");
    } catch (e) {
      console.error("[cleenzy] email failed:", e);
      await record("email", ctx.email, "failed", String(e));
    }
  }

  if (ctx.phone && SMS_CRITICAL.includes(key)) {
    try {
      const r = await sendSms(ctx.phone, sms);
      await record("sms", ctx.phone, r.skipped ? "skipped" : "sent");
    } catch (e) {
      console.error("[cleenzy] sms failed:", e);
      await record("sms", ctx.phone, "failed", String(e));
    }
  }
}

/** Status changes that are worth telling the customer about. */
export const STATUS_TEMPLATE: Partial<Record<OrderStatus, TemplateKey>> = {
  picked_up: "picked_up",
  received: "laundry_received",
  ready: "laundry_ready",
  out_for_delivery: "out_for_delivery",
  completed: "delivered",
};
