-- Cleenzy — lock down function execution and pin search_path.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, which the
-- earlier migrations never revoked. That left next_order_number() callable by
-- anonymous visitors, who could burn the day's order-number sequence, and it
-- exposed the internal trigger and helper functions for no reason.
--
-- A mutable search_path in a security definer function is also a privilege
-- escalation route, so every function below pins it.

-- ---------------------------------------------------------------------------
-- Pin search_path on the functions that were missing it.
-- ---------------------------------------------------------------------------

alter function public.touch_updated_at()      set search_path = public;
alter function public.derive_order_amounts()  set search_path = public;
alter function public.derive_item_total()     set search_path = public;
alter function public.is_admin()              set search_path = public;
alter function public.can_see_finance()       set search_path = public;

-- ---------------------------------------------------------------------------
-- Trigger functions are never called directly — Postgres refuses it — so no
-- client role needs EXECUTE. Triggers fire regardless of caller privilege.
-- ---------------------------------------------------------------------------

revoke all on function public.touch_updated_at()      from public, anon, authenticated;
revoke all on function public.derive_order_amounts()  from public, anon, authenticated;
revoke all on function public.derive_item_total()     from public, anon, authenticated;
revoke all on function public.recalc_order_subtotal() from public, anon, authenticated;
revoke all on function public.recalc_order_payment()  from public, anon, authenticated;
revoke all on function public.log_order_status()      from public, anon, authenticated;
revoke all on function public.handle_new_user()       from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- next_order_number mutates the daily counter. Only order inserts need it,
-- and anon has no insert policy on orders, so authenticated is enough.
-- ---------------------------------------------------------------------------

revoke all on function public.next_order_number() from public, anon;
grant execute on function public.next_order_number() to authenticated;

-- advance_order_status already refuses unauthorised callers internally; this
-- stops anonymous visitors reaching that check at all.
revoke all on function public.advance_order_status(uuid, public.order_status, text)
  from public, anon;
grant execute on function public.advance_order_status(uuid, public.order_status, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- The role helpers stay executable by anon on purpose. RLS policy expressions
-- are evaluated with the caller's privileges, and the public read policies on
-- services, service_areas, time_slots and settings call is_staff()/is_admin().
-- Revoking these would break the anonymous price list. They only ever report
-- the caller's own role, so exposure costs nothing.
-- ---------------------------------------------------------------------------

grant execute on function public.auth_role()       to anon, authenticated;
grant execute on function public.has_role(variadic public.user_role[]) to anon, authenticated;
grant execute on function public.is_staff()        to anon, authenticated;
grant execute on function public.is_admin()        to anon, authenticated;
grant execute on function public.can_see_finance() to anon, authenticated;

-- Guest tracking stays open to anon; the function itself requires a matching
-- phone number before it returns anything.
grant execute on function public.track_order(text, text) to anon, authenticated;
