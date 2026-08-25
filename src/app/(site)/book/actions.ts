"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { notify } from "@/lib/notify";
import { isValidPhPhone } from "@/lib/format";

/**
 * Customers do not have accounts. Every booking is a plain client form,
 * written through the create_booking database gateway — a security-definer
 * function that recomputes every price, minimum and fee from the database
 * itself. The web server needs only the public key; there is no
 * service-role credential in this path.
 */

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your name").max(120),
  customer_phone: z.string().trim().refine(isValidPhPhone, "Enter a valid PH mobile number"),
  customer_email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),

  selections: z.array(z.object({
    serviceId: z.string().uuid(),
    quantity: z.coerce.number().positive("Quantity must be more than zero").max(500),
  })).min(1, "Choose at least one service"),

  order_type: z.enum(["pickup_delivery", "dropoff"]),

  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  pickup_slot_id: z.string().uuid().nullable().optional(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  delivery_slot_id: z.string().uuid().nullable().optional(),

  service_area_id: z.string().uuid().nullable().optional(),
  address: z.object({
    line1: z.string().trim().min(5, "House/street is required").max(200),
    barangay: z.string().trim().max(100).optional().or(z.literal("")),
    city: z.string().trim().min(2, "City is required").max(100),
    landmark: z.string().trim().max(200).optional().or(z.literal("")),
  }).nullable().optional(),

  payment_method: z.enum(["cash", "gcash", "bank_transfer", "card"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createBooking(raw: BookingInput): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      fieldErrors,
    };
  }
  const input = parsed.data;

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Bookings are not available yet — the site is not connected to its database." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p: {
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email || null,
      order_type: input.order_type,
      service_area_id: input.service_area_id ?? null,
      pickup_date: input.pickup_date ?? null,
      pickup_slot_id: input.pickup_slot_id ?? null,
      delivery_date: input.delivery_date ?? null,
      delivery_slot_id: input.delivery_slot_id ?? null,
      address: input.address ?? null,
      payment_method: input.payment_method,
      notes: input.notes || null,
      selections: input.selections.map((s) => ({
        service_id: s.serviceId,
        quantity: s.quantity,
      })),
    },
  });

  if (error) {
    // The gateway raises human-readable messages ("Choose a pickup date and
    // time slot.", the minimum-order explanation, …) — show them as-is.
    console.error("[cleenzy] create_booking failed:", error);
    const friendly = error.message && !/^(function|permission|invalid input)/i.test(error.message)
      ? error.message
      : "Could not create your booking. Please try again.";
    return { ok: false, error: friendly };
  }

  const result = data as { order_id: string; order_number: string } | null;
  if (!result?.order_number) {
    return { ok: false, error: "Could not create your booking. Please try again." };
  }

  // Confirmation is best-effort; the booking is already safe in the database.
  try {
    let slotLabel: string | null = null;
    if (input.pickup_slot_id) {
      const { data: slot } = await supabase
        .from("time_slots").select("label").eq("id", input.pickup_slot_id).maybeSingle();
      slotLabel = (slot?.label as string) ?? null;
    }
    await notify("order_confirmed", {
      orderId: result.order_id,
      orderNumber: result.order_number,
      customerName: input.customer_name,
      email: input.customer_email || null,
      phone: input.customer_phone,
      pickupDate: input.pickup_date ?? null,
      deliveryDate: input.delivery_date ?? null,
      slotLabel,
    });
  } catch (e) {
    console.error("[cleenzy] confirmation notification failed:", e);
  }

  return { ok: true, orderNumber: result.order_number };
}
