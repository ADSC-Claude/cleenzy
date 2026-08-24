"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { notify, STATUS_TEMPLATE } from "@/lib/notify";
import { orderStatusForTask } from "@/lib/status";
import type { OrderStatus, PaymentMethod, TaskStatus, UserRole } from "@/lib/types";

/**
 * Every action runs through the caller's own session client, so Postgres RLS
 * is the thing actually granting or denying the write — these checks are a
 * second line that produces a readable message instead of a raw error.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const FINANCE_ROLES: UserRole[] = ["owner", "manager", "cashier"];
const ADMIN_ROLES: UserRole[] = ["owner", "manager"];

async function requireRoles(roles: UserRole[]): Promise<
  { ok: true; role: UserRole; id: string } | { ok: false; error: string }
> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "You are signed out. Please sign in again." };
  if (!profile.is_active) return { ok: false, error: "Your account is inactive." };
  if (!roles.includes(profile.role)) {
    return { ok: false, error: "You do not have permission to do that." };
  }
  return { ok: true, role: profile.role, id: profile.id };
}

function refreshAdmin(orderId?: string) {
  revalidatePath("/admin", "layout");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

/** Notify the customer when a status change is one they care about. */
async function notifyStatus(orderId: string, status: OrderStatus) {
  const template = STATUS_TEMPLATE[status];
  if (!template) return;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("order_number, customer_name, customer_email, customer_phone, total_amount, amount_paid, delivery_date")
      .eq("id", orderId).maybeSingle();
    if (!data) return;
    await notify(template, {
      orderId,
      orderNumber: data.order_number as string,
      customerName: data.customer_name as string,
      email: data.customer_email as string | null,
      phone: data.customer_phone as string,
      total: Number(data.total_amount),
      amountDue: Number(data.total_amount) - Number(data.amount_paid),
      deliveryDate: data.delivery_date as string | null,
    });
  } catch (e) {
    console.error("[cleenzy] status notification failed:", e);
  }
}

/* ------------------------------------------------------------------ Status */

export async function changeOrderStatus(
  orderId: string, status: OrderStatus, note?: string,
): Promise<ActionResult> {
  const auth = await requireRoles([...FINANCE_ROLES, "laundry_staff"]);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  // advance_order_status enforces that laundry staff stay inside the laundry
  // states; going through it keeps that rule in one place.
  const { error } = await supabase.rpc("advance_order_status", {
    p_order_id: orderId, p_status: status, p_note: note ?? null,
  });

  if (error) {
    console.error("[cleenzy] status change failed:", error);
    return { ok: false, error: error.message || "Could not update the status." };
  }

  await notifyStatus(orderId, status);
  refreshAdmin(orderId);
  return { ok: true };
}

/* ------------------------------------------------------------- Order edits */

export async function updateOrderDetails(
  orderId: string,
  patch: {
    actual_weight_kg?: number | null;
    additional_charges?: number;
    charges_reason?: string | null;
    discount_amount?: number;
    discount_reason?: string | null;
    pickup_fee?: number;
    delivery_fee?: number;
    assigned_staff_id?: string | null;
    assigned_rider_id?: string | null;
    internal_notes?: string | null;
    pickup_date?: string | null;
    delivery_date?: string | null;
  },
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) {
    console.error("[cleenzy] order update failed:", error);
    return { ok: false, error: "Could not save those changes." };
  }
  refreshAdmin(orderId);
  return { ok: true };
}

/** Records the weighed quantity on a line; the database recomputes the total. */
export async function updateItemQuantity(
  itemId: string, orderId: string, actualQuantity: number | null,
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;
  if (actualQuantity !== null && (!Number.isFinite(actualQuantity) || actualQuantity < 0)) {
    return { ok: false, error: "Enter a quantity of zero or more." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("order_items").update({ actual_quantity: actualQuantity }).eq("id", itemId);
  if (error) return { ok: false, error: "Could not update that line." };
  refreshAdmin(orderId);
  return { ok: true };
}

export async function addOrderItem(
  orderId: string, serviceId: string, quantity: number,
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;
  if (!(quantity > 0)) return { ok: false, error: "Enter a quantity above zero." };

  const supabase = await createClient();
  const { data: service, error: svcErr } = await supabase
    .from("services").select("*").eq("id", serviceId).maybeSingle();
  if (svcErr || !service) return { ok: false, error: "That service no longer exists." };

  const { error } = await supabase.from("order_items").insert({
    order_id: orderId,
    service_id: service.id,
    service_name: service.name,
    unit: service.unit,
    unit_price: service.price,
    quantity,
  });
  if (error) return { ok: false, error: "Could not add that service." };
  refreshAdmin(orderId);
  return { ok: true };
}

export async function removeOrderItem(
  itemId: string, orderId: string,
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("order_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: "Could not remove that line." };
  refreshAdmin(orderId);
  return { ok: true };
}

export async function cancelOrder(
  orderId: string, reason: string,
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;
  if (!reason.trim()) return { ok: false, error: "Give a reason for cancelling." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancel_reason: reason.trim() })
    .eq("id", orderId);
  if (error) return { ok: false, error: "Could not cancel that order." };
  refreshAdmin(orderId);
  return { ok: true };
}

/* ---------------------------------------------------------------- Payments */

export async function recordPayment(
  orderId: string, amount: number, method: PaymentMethod,
  reference?: string, notes?: string,
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;
  if (!(amount > 0)) return { ok: false, error: "Enter an amount above zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    order_id: orderId,
    amount,
    method,
    reference_number: reference?.trim() || null,
    received_by: auth.id,
    notes: notes?.trim() || null,
  });
  if (error) {
    console.error("[cleenzy] payment insert failed:", error);
    return { ok: false, error: "Could not record that payment." };
  }

  try {
    const { data } = await supabase
      .from("orders")
      .select("order_number, customer_name, customer_email, customer_phone")
      .eq("id", orderId).maybeSingle();
    if (data) {
      await notify("payment_received", {
        orderId,
        orderNumber: data.order_number as string,
        customerName: data.customer_name as string,
        email: data.customer_email as string | null,
        phone: data.customer_phone as string,
        total: amount,
      });
    }
  } catch (e) {
    console.error("[cleenzy] payment notification failed:", e);
  }

  refreshAdmin(orderId);
  return { ok: true };
}

export async function deletePayment(
  paymentId: string, orderId: string,
): Promise<ActionResult> {
  const auth = await requireRoles(ADMIN_ROLES);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { ok: false, error: "Could not remove that payment." };
  refreshAdmin(orderId);
  return { ok: true };
}

/* --------------------------------------------------------------- Logistics */

export async function assignRider(
  taskId: string, riderId: string | null,
): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_tasks").update({ rider_id: riderId }).eq("id", taskId);
  if (error) return { ok: false, error: "Could not assign that rider." };

  // Mirror the assignment onto the order so the orders list can show it.
  const { data: task } = await supabase
    .from("delivery_tasks").select("order_id, task_type").eq("id", taskId).maybeSingle();
  if (task) {
    await supabase.from("orders")
      .update({ assigned_rider_id: riderId }).eq("id", task.order_id);
  }

  refreshAdmin();
  return { ok: true };
}

/**
 * Advancing a rider task also moves the order itself, which is what keeps the
 * customer's tracking page in step with what the rider is doing.
 */
export async function advanceTask(
  taskId: string, status: TaskStatus,
): Promise<ActionResult> {
  const auth = await requireRoles([...FINANCE_ROLES, "rider"]);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: task, error: readErr } = await supabase
    .from("delivery_tasks").select("*").eq("id", taskId).maybeSingle();
  if (readErr || !task) return { ok: false, error: "Could not find that task." };

  if (auth.role === "rider" && task.rider_id !== auth.id) {
    return { ok: false, error: "That task is assigned to someone else." };
  }

  const { error } = await supabase
    .from("delivery_tasks")
    .update({
      status,
      completed_at:
        status === "delivered" || status === "picked_up"
          ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: "Could not update that task." };

  const nextOrderStatus = orderStatusForTask(task.task_type, status);
  if (nextOrderStatus) {
    const { error: statusErr } = await supabase.rpc("advance_order_status", {
      p_order_id: task.order_id, p_status: nextOrderStatus, p_note: null,
    });
    if (statusErr) {
      console.error("[cleenzy] order status did not follow task:", statusErr);
    } else {
      await notifyStatus(task.order_id, nextOrderStatus);
    }
  }

  refreshAdmin(task.order_id);
  return { ok: true };
}

/* ---------------------------------------------------------------- Services */

export async function saveService(
  id: string | null,
  patch: {
    name: string; description: string; price: number;
    unit: string; turnaround_hours: number; min_quantity: number;
    is_active: boolean; sort_order: number;
  },
): Promise<ActionResult> {
  const auth = await requireRoles(ADMIN_ROLES);
  if (!auth.ok) return auth;
  if (!patch.name.trim()) return { ok: false, error: "Give the service a name." };
  if (!(patch.price >= 0)) return { ok: false, error: "Enter a price of zero or more." };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("services").update(patch).eq("id", id);
    if (error) return { ok: false, error: "Could not save that service." };
  } else {
    const slug = patch.name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("services").insert({ ...patch, slug });
    if (error) {
      return {
        ok: false,
        error: error.code === "23505"
          ? "A service with a similar name already exists."
          : "Could not create that service.",
      };
    }
  }

  // Pricing is public, so the website must pick the change up immediately.
  revalidatePath("/", "layout");
  refreshAdmin();
  return { ok: true };
}

export async function toggleService(
  id: string, isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireRoles(ADMIN_ROLES);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("services").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: "Could not update that service." };

  revalidatePath("/", "layout");
  refreshAdmin();
  return { ok: true };
}

/* ------------------------------------------------------------------- Staff */

export async function updateStaffRole(
  profileId: string, role: UserRole,
): Promise<ActionResult> {
  const auth = await requireRoles(ADMIN_ROLES);
  if (!auth.ok) return auth;

  // Only an owner may create another owner, and nobody may demote themselves
  // out of the role that lets them fix a mistake.
  if (role === "owner" && auth.role !== "owner") {
    return { ok: false, error: "Only an owner can grant owner access." };
  }
  if (profileId === auth.id) {
    return { ok: false, error: "You cannot change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) return { ok: false, error: "Could not update that role." };
  refreshAdmin();
  return { ok: true };
}

export async function setStaffActive(
  profileId: string, isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireRoles(ADMIN_ROLES);
  if (!auth.ok) return auth;
  if (profileId === auth.id) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles").update({ is_active: isActive }).eq("id", profileId);
  if (error) return { ok: false, error: "Could not update that account." };
  refreshAdmin();
  return { ok: true };
}

/* --------------------------------------------------------------- Reminders */

export async function sendPaymentReminder(orderId: string): Promise<ActionResult> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email, customer_phone, total_amount, amount_paid")
    .eq("id", orderId).maybeSingle();
  if (!data) return { ok: false, error: "Could not find that order." };

  await notify("payment_reminder", {
    orderId,
    orderNumber: data.order_number as string,
    customerName: data.customer_name as string,
    email: data.customer_email as string | null,
    phone: data.customer_phone as string,
    amountDue: Number(data.total_amount) - Number(data.amount_paid),
  });

  refreshAdmin(orderId);
  return { ok: true };
}

/* --------------------------------------------------------- Walk-in intake */

/**
 * Counter intake. Deliberately separate from the public booking action: that
 * one attributes the order to the signed-in user, which would make the
 * cashier the customer on every walk-in.
 */
export async function createWalkInOrder(input: {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  selections: Array<{ serviceId: string; quantity: number }>;
  order_type: "pickup_delivery" | "dropoff";
  pickup_date?: string | null;
  delivery_date?: string | null;
  payment_method: PaymentMethod;
  notes?: string;
}): Promise<{ ok: true; orderId: string; orderNumber: string } | { ok: false; error: string }> {
  const auth = await requireRoles(FINANCE_ROLES);
  if (!auth.ok) return auth;

  if (input.customer_name.trim().length < 2) {
    return { ok: false, error: "Enter the customer's name." };
  }
  if (input.customer_phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Enter a valid mobile number." };
  }
  const selections = input.selections.filter((s) => s.quantity > 0);
  if (selections.length === 0) {
    return { ok: false, error: "Add at least one service." };
  }

  const supabase = await createClient();

  const { data: serviceRows, error: svcErr } = await supabase
    .from("services").select("*").in("id", selections.map((s) => s.serviceId));
  if (svcErr || !serviceRows?.length) {
    return { ok: false, error: "Could not load the selected services." };
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: "",
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone.replace(/\D/g, ""),
      customer_email: input.customer_email?.trim() || null,
      order_type: input.order_type,
      // A walk-in is physically in our hands already, so it starts at
      // "received" rather than waiting on a pickup that will never happen.
      status: input.order_type === "dropoff" ? "received" : "placed",
      payment_method: input.payment_method,
      pickup_date: input.pickup_date || null,
      delivery_date: input.delivery_date || null,
      notes: input.notes?.trim() || null,
    })
    .select("id, order_number").single();

  if (orderErr || !order) {
    console.error("[cleenzy] walk-in insert failed:", orderErr);
    return { ok: false, error: "Could not create that order." };
  }

  const items = selections.map((sel) => {
    const svc = serviceRows.find((s) => s.id === sel.serviceId)!;
    return {
      order_id: order.id,
      service_id: svc.id,
      service_name: svc.name,
      unit: svc.unit,
      unit_price: svc.price,
      quantity: Math.max(sel.quantity, Number(svc.min_quantity) || 0),
    };
  });

  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Could not save the services on that order." };
  }

  refreshAdmin();
  return {
    ok: true,
    orderId: order.id as string,
    orderNumber: order.order_number as string,
  };
}

/* ---------------------------------------------------------------- Settings */

export async function saveSettings(
  key: string, value: Record<string, unknown>,
): Promise<ActionResult> {
  const auth = await requireRoles(["owner"]);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings").update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) {
    console.error("[cleenzy] settings update failed:", error);
    return { ok: false, error: "Could not save those settings." };
  }

  // Contact details and fees are rendered across the public site.
  revalidatePath("/", "layout");
  refreshAdmin();
  return { ok: true };
}
