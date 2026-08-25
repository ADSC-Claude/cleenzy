import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS, so it is confined to server actions that
 * have already established who the caller is and what they may do.
 *
 * Guest bookings do NOT need it — they go through the create_booking
 * database gateway. This client only records notification history and backs
 * future server-side features, so the site runs fully without the key.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for booking and admin writes.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
