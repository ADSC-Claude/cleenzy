"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { quote } from "@/lib/pricing";
import { notify } from "@/lib/notify";
import { isValidPhPhone, normalisePhone } from "@/lib/format";
import type { Service, ServiceArea } from "@/lib/types";

const addressSchema = z.object({
  label: z.string().trim().max(40).default("Home"),
  recipient_name: z.string().trim().min(2, "Recipient name is required").max(120),
  phone: z.string().trim().refine(isValidPhPhone, "Enter a valid PH mobile number"),
  line1: z.string().trim().min(5, "House/street is required").max(200),
  barangay: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  service_area_id: z.string().uuid().nullable().optional(),
});

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
  saved_address_id: z.string().uuid().nullable().optional(),
  address: addressSchema.nullable().optional(),

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

  if (input.order_type === "pickup_delivery") {
    if (!input.pickup_date || !input.pickup_slot_id) {
      return { ok: false, error: "Choose a pickup date and time slot." };
    }
    if (!input.saved_address_id && !input.address) {
      return { ok: false, error: "Add a pickup address." };
    }
  }

  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch {
    return {
      ok: false,
      error: "Bookings are not available yet — the server is missing its Supabase credentials.",
    };
  }

  // The client sends choices, never prices. Rates, minimums and fees are all
  // re-read from the database so a tampered payload cannot change the total.
  const ids = input.selections.map((s) => s.serviceId);
  const { data: serviceRows, error: svcErr } = await db
    .from("services").select("*").in("id", ids).eq("is_active", true);
  if (svcErr) return { ok: false, error: "Could not load services. Please try again." };

  const services = (serviceRows ?? []) as Service[];
  if (services.length === 0) {
    return { ok: false, error: "The services you selected are no longer available." };
  }

  let area: ServiceArea | null = null;
  if (input.order_type === "pickup_delivery" && input.service_area_id) {
    const { data } = await db
      .from("service_areas").select("*").eq("id", input.service_area_id).maybeSingle();
    area = (data as ServiceArea) ?? null;
  }

  const q = quote({
    selections: input.selections,
    services,
    orderType: input.order_type,
    area,
  });

  if (q.lines.length === 0) {
    return { ok: false, error: "Choose at least one service." };
  }
  if (q.belowMinimumOrder) {
    return {
      ok: false,
      error: `Pickup in this area needs a minimum order of ₱${q.minOrderAmount.toFixed(2)}. Add more items or drop off at the shop instead.`,
    };
  }

  // A signed-in customer's order is linked to their account; guests are not.
  let customerId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    customerId = user?.id ?? null;
  } catch {
    customerId = null;
  }

  // Resolve the pickup/delivery address.
  let addressId: string | null = input.saved_address_id ?? null;
  if (input.order_type === "pickup_delivery" && !addressId && input.address) {
    const a = input.address;
    const { data: inserted, error: addrErr } = await db
      .from("addresses")
      .insert({
        customer_id: customerId,
        label: a.label || "Home",
        recipient_name: a.recipient_name,
        phone: normalisePhone(a.phone),
        line1: a.line1,
        barangay: a.barangay || null,
        city: a.city,
        province: a.province || null,
        landmark: a.landmark || null,
        service_area_id: a.service_area_id ?? input.service_area_id ?? null,
      })
      .select("id").single();
    if (addrErr) return { ok: false, error: "Could not save your address. Please try again." };
    addressId = inserted.id as string;
  }

  const isPickup = input.order_type === "pickup_delivery";
  const estimatedWeight = q.lines
    .filter((l) => l.unit === "per_kg")
    .reduce((sum, l) => sum + l.billedQuantity, 0);

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      order_number: "",             // filled in by the derive_order_amounts trigger
      customer_id: customerId,
      customer_name: input.customer_name,
      customer_phone: normalisePhone(input.customer_phone),
      customer_email: input.customer_email || null,
      order_type: input.order_type,
      status: "placed",
      payment_method: input.payment_method,
      pickup_date: isPickup ? input.pickup_date : null,
      pickup_slot_id: isPickup ? input.pickup_slot_id : null,
      pickup_address_id: isPickup ? addressId : null,
      delivery_date: input.delivery_date ?? null,
      delivery_slot_id: isPickup ? (input.delivery_slot_id ?? null) : null,
      delivery_address_id: isPickup ? addressId : null,
      service_area_id: isPickup ? (input.service_area_id ?? null) : null,
      estimated_weight_kg: estimatedWeight > 0 ? estimatedWeight : null,
      pickup_fee: q.pickupFee,
      delivery_fee: q.deliveryFee,
      notes: input.notes || null,
    })
    .select("id, order_number").single();

  if (orderErr || !order) {
    console.error("[cleenzy] order insert failed:", orderErr);
    return { ok: false, error: "Could not create your booking. Please try again." };
  }

  const { error: itemsErr } = await db.from("order_items").insert(
    q.lines.map((l) => ({
      order_id: order.id,
      service_id: l.serviceId,
      service_name: l.name,
      unit: l.unit,
      unit_price: l.unitPrice,
      quantity: l.billedQuantity,
    })),
  );

  if (itemsErr) {
    // Without line items the order has no value and would sit at ₱0 in the
    // admin list, so remove it rather than leave a confusing shell behind.
    console.error("[cleenzy] order items insert failed, rolling back:", itemsErr);
    await db.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Could not save your selected services. Please try again." };
  }

  if (isPickup) {
    const tasks: Array<{
      order_id: string;
      task_type: "pickup" | "delivery";
      scheduled_date: string | null;
      slot_id: string | null;
      address_id: string | null;
      status: "assigned";
    }> = [
      {
        order_id: order.id, task_type: "pickup",
        scheduled_date: input.pickup_date ?? null,
        slot_id: input.pickup_slot_id ?? null,
        address_id: addressId, status: "assigned",
      },
    ];
    if (input.delivery_date) {
      tasks.push({
        order_id: order.id, task_type: "delivery",
        scheduled_date: input.delivery_date,
        slot_id: input.delivery_slot_id ?? null,
        address_id: addressId, status: "assigned",
      });
    }
    const { error: taskErr } = await db.from("delivery_tasks").insert(tasks);
    if (taskErr) {
      // The order is valid without tasks — admin can assign a rider manually.
      console.error("[cleenzy] delivery task insert failed:", taskErr);
    }
  }

  let slotLabel: string | null = null;
  if (input.pickup_slot_id) {
    const { data: slot } = await db
      .from("time_slots").select("label").eq("id", input.pickup_slot_id).maybeSingle();
    slotLabel = (slot?.label as string) ?? null;
  }

  // Never let a notification problem sink a completed booking.
  try {
    await notify("order_confirmed", {
      orderId: order.id,
      orderNumber: order.order_number as string,
      customerName: input.customer_name,
      email: input.customer_email || null,
      phone: normalisePhone(input.customer_phone),
      total: q.total,
      pickupDate: input.pickup_date ?? null,
      deliveryDate: input.delivery_date ?? null,
      slotLabel,
    });
  } catch (e) {
    console.error("[cleenzy] confirmation notification failed:", e);
  }

  return { ok: true, orderNumber: order.order_number as string };
}
