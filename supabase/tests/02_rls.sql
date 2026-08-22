\set ON_ERROR_STOP on
-- Verifies the access model actually holds in Postgres, not just in the UI.

-- Supabase grants these by default; the local shim must do it explicitly.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated;

-- Test accounts, one per role.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@test'),
  ('00000000-0000-0000-0000-00000000000b', 'laundry@test'),
  ('00000000-0000-0000-0000-00000000000c', 'rider1@test'),
  ('00000000-0000-0000-0000-00000000000d', 'rider2@test'),
  ('00000000-0000-0000-0000-00000000000e', 'cashier@test')
on conflict do nothing;

update public.profiles set role='owner',         full_name='Owner'   where id='00000000-0000-0000-0000-00000000000a';
update public.profiles set role='laundry_staff', full_name='Laundry' where id='00000000-0000-0000-0000-00000000000b';
update public.profiles set role='rider',         full_name='Rider 1' where id='00000000-0000-0000-0000-00000000000c';
update public.profiles set role='rider',         full_name='Rider 2' where id='00000000-0000-0000-0000-00000000000d';
update public.profiles set role='cashier',       full_name='Cashier' where id='00000000-0000-0000-0000-00000000000e';

-- An order sitting in the laundry, with two rider legs on different riders.
insert into public.orders (id, order_number, customer_name, customer_phone, status, pickup_fee)
values ('00000000-0000-0000-0000-0000000000f1', '', 'RLS Test Customer', '09171234567', 'washing', 50);

insert into public.order_items (order_id, service_id, service_name, unit, unit_price, quantity)
select '00000000-0000-0000-0000-0000000000f1', id, name, unit, price, 4
from public.services where slug='wash-fold';

insert into public.delivery_tasks (order_id, task_type, rider_id, status, cod_amount) values
  ('00000000-0000-0000-0000-0000000000f1', 'pickup',   '00000000-0000-0000-0000-00000000000c', 'assigned', 0),
  ('00000000-0000-0000-0000-0000000000f1', 'delivery', '00000000-0000-0000-0000-00000000000d', 'assigned', 370);

insert into public.payments (order_id, amount, method)
values ('00000000-0000-0000-0000-0000000000f1', 100, 'gcash');

\echo ''
\echo '=== LAUNDRY STAFF ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

\echo 'orders readable (expect 0 — no select policy for laundry staff):'
select count(*) as orders_visible from public.orders;
\echo 'payments readable (expect 0):'
select count(*) as payments_visible from public.payments;
\echo 'laundry_queue readable (expect 2 in-laundry orders) with no money columns:'
select count(*) as queue_visible from public.laundry_queue;
select string_agg(column_name, ', ' order by column_name) as queue_columns
from information_schema.columns where table_name='laundry_queue';

commit;

\echo ''
\echo '=== RIDER 1 (assigned the pickup leg only) ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';

\echo 'delivery_tasks readable (expect 1 — own leg only, not the sibling leg):'
select count(*) as tasks_visible from public.delivery_tasks;
\echo 'rider_tasks rows and their type (expect one pickup):'
select task_type, cod_amount from public.rider_tasks;
\echo 'payments readable (expect 0):'
select count(*) as payments_visible from public.payments;

commit;

\echo ''
\echo '=== CASHIER ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
\echo 'orders and payments readable (expect every row — cashier sees money):'
select (select count(*) from public.orders)   as orders_visible,
       (select count(*) from public.payments) as payments_visible;
\echo 'settings readable (expect 3 public rows; the notifications row stays hidden):'
select count(*) as settings_visible from public.settings;

commit;

\echo ''
\echo '=== ANONYMOUS VISITOR ==='
begin;
set local role anon;
\echo 'services readable (expect 8 — the public price list):'
select count(*) as services_visible from public.services;
\echo 'orders readable (expect 0):'
select count(*) as orders_visible from public.orders;
\echo 'order_counters readable (expect 0 — RLS on, no policy):'
select count(*) as counters_visible from public.order_counters;

commit;

\echo ''
\echo '=== LAUNDRY STAFF STATUS MOVES ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
\echo 'may advance within the laundry (expect drying):'
select public.advance_order_status('00000000-0000-0000-0000-0000000000f1', 'drying');
commit;

\echo ''
\echo '=== LAUNDRY STAFF CANNOT LEAVE THE LAUNDRY ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
\echo 'jumping straight to completed must be refused:'
do $$
begin
  perform public.advance_order_status('00000000-0000-0000-0000-0000000000f1', 'completed');
  raise exception 'SECURITY REGRESSION: laundry staff completed an order';
exception
  when others then
    if position('may only move orders' in sqlerrm) > 0 then
      raise notice 'refused as expected: %', sqlerrm;
    else
      raise;
    end if;
end $$;
commit;

\echo ''
\echo '=== RIDER CANNOT TOUCH ANOTHER RIDER''S LEG ==='
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
\echo 'updating rider 2 leg affects 0 rows:'
with attempted as (
  update public.delivery_tasks set status = 'delivered'
  where rider_id = '00000000-0000-0000-0000-00000000000d'
  returning 1
)
select count(*) as rows_rider1_could_change from attempted;
commit;
