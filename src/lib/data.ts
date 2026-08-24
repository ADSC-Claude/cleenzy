import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./env";
import type { Service, ServiceArea, TimeSlot } from "./types";

/**
 * Every reader below returns an empty result when the backend is unreachable,
 * so a misconfigured deployment shows an honest banner rather than a stack
 * trace.
 */
export { isSupabaseConfigured } from "./env";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error("[cleenzy] data fetch failed:", err);
    return fallback;
  }
}

export async function getServices(includeInactive = false): Promise<Service[]> {
  return safe(async () => {
    const supabase = await createClient();
    let q = supabase.from("services").select("*").order("sort_order");
    if (!includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Service[];
  }, []);
}

export async function getServiceAreas(includeInactive = false): Promise<ServiceArea[]> {
  return safe(async () => {
    const supabase = await createClient();
    let q = supabase.from("service_areas").select("*").order("sort_order");
    if (!includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ServiceArea[];
  }, []);
}

export async function getTimeSlots(): Promise<TimeSlot[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("time_slots").select("*").eq("is_active", true).order("sort_order");
    if (error) throw error;
    return (data ?? []) as TimeSlot[];
  }, []);
}

export interface BusinessSettings {
  name: string; tagline: string; phone: string; email: string;
  address: string; hours: string;
}

export interface PaymentSettings {
  gcash_name: string; gcash_number: string;
  bank_name: string; bank_account_name: string; bank_account_number: string;
  card_enabled: boolean;
}

const DEFAULT_BUSINESS: BusinessSettings = {
  name: "Cleenzy",
  tagline: "Fresh laundry, picked up and delivered.",
  phone: "+63 917 000 0000",
  email: "hello@cleenzy.ph",
  address: "123 Kalayaan Avenue, Poblacion, Makati City",
  hours: "Mon–Sat, 8:00 AM – 7:00 PM",
};

const DEFAULT_PAYMENTS: PaymentSettings = {
  gcash_name: "Cleenzy Laundry Services",
  gcash_number: "0917 000 0000",
  bank_name: "BPI",
  bank_account_name: "Cleenzy Laundry Services",
  bank_account_number: "0000-0000-00",
  card_enabled: false,
};

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return (data?.value as T) ?? fallback;
  }, fallback);
}

export const getBusiness = () => getSetting<BusinessSettings>("business", DEFAULT_BUSINESS);
export const getPaymentSettings = () => getSetting<PaymentSettings>("payments", DEFAULT_PAYMENTS);
