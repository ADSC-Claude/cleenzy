"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";

/**
 * Keeps a server-rendered admin screen in step with what other staff are
 * doing. It subscribes to Postgres changes and also refreshes on a slow
 * interval.
 *
 * The interval is not redundant: Realtime honours row level security, and
 * laundry staff deliberately have no select policy on public.orders, so their
 * subscription receives nothing. Polling is what keeps the queue live for
 * them, while roles that can read orders get near-instant updates.
 */
export function useLiveRefresh(table: string, intervalMs = 15_000) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const refresh = () => { if (!cancelled) router.refresh(); };

    const interval = setInterval(refresh, intervalMs);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return () => { cancelled = true; clearInterval(interval); };

    const supabase = createClient();
    const channel = supabase
      .channel(`cleenzy:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [router, table, intervalMs]);
}
