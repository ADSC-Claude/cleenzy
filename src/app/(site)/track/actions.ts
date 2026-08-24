"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data";
import type { TrackedOrder } from "@/lib/types";

export type LookupResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; error: string };

/**
 * Guest tracking goes through the track_order RPC, which requires both the
 * order number and the phone number on the order — an order number on its own
 * is not enough to read anyone's details.
 */
export async function lookupOrder(
  orderNumber: string, phone: string,
): Promise<LookupResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Order tracking is not connected yet." };
  }
  if (!orderNumber.trim()) {
    return { ok: false, error: "Enter your order number." };
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return { ok: false, error: "Enter the mobile number you booked with." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: orderNumber.trim(),
      p_phone: phone.trim(),
    });

    if (error) {
      console.error("[cleenzy] track_order failed:", error);
      return { ok: false, error: "Could not look up that order. Please try again." };
    }
    if (!data) {
      return {
        ok: false,
        error: "We could not find an order with that number and mobile number. Please check both and try again.",
      };
    }
    return { ok: true, order: data as TrackedOrder };
  } catch (e) {
    console.error("[cleenzy] track_order threw:", e);
    return { ok: false, error: "Could not look up that order. Please try again." };
  }
}
