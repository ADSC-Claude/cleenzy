-- Cleenzy — table privileges for the anon and authenticated roles.
--
-- Row level security decides which ROWS a caller may touch, but Postgres
-- checks table GRANTs first. Without these, every query through the anon or
-- authenticated key fails with "permission denied for table ..." no matter
-- how correct the policies are.
--
-- A stock Supabase project grants these to new tables through default
-- privileges. That cannot be relied on — in a project where the schema was
-- created by other tooling the default privileges may not reach tables
-- created later, which is exactly what happened on first deploy. Granting
-- explicitly makes these migrations self-sufficient on any project.

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Anonymous visitors: the public catalogue only.
-- Booking is written server-side with the service role, so anon never needs
-- insert rights on orders. Row visibility is still narrowed by RLS
-- (services/areas/slots to is_active, settings to is_public).
-- ---------------------------------------------------------------------------

grant select on public.services      to anon;
grant select on public.service_areas to anon;
grant select on public.time_slots    to anon;
grant select on public.settings      to anon;

-- ---------------------------------------------------------------------------
-- Signed-in users: customers and staff share one Postgres role, and the
-- policies do the separating. A customer reaching public.orders sees only
-- their own rows; laundry staff have no select policy there at all.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.profiles       to authenticated;
grant select, insert, update, delete on public.addresses      to authenticated;
grant select, insert, update, delete on public.orders         to authenticated;
grant select, insert, update, delete on public.order_items    to authenticated;
grant select, insert, update, delete on public.delivery_tasks to authenticated;
grant select, insert, update, delete on public.payments       to authenticated;
grant select, insert on public.order_status_history           to authenticated;
grant select on public.notifications                          to authenticated;

grant select, insert, update, delete on public.services       to authenticated;
grant select, insert, update, delete on public.service_areas  to authenticated;
grant select, insert, update, delete on public.time_slots     to authenticated;
grant select, update on public.settings                       to authenticated;

-- public.order_counters is deliberately left with no grant to any client
-- role. It is written only by next_order_number(), which runs as definer.
