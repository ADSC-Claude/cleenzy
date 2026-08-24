"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client — anon key, RLS applies. Used for realtime subscriptions. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
