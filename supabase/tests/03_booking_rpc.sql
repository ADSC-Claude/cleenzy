\set ON_ERROR_STOP on
-- The booking gateway: anon creates correctly-priced orders and nothing else.

\echo ''
\echo '=== ANON BOOKS A PICKUP ORDER ==='
begin;
set local role anon;
create temp table _booking as
select public.create_booking(jsonb_build_object(
  'customer_name', 'Gateway Test',
  'customer_phone', '0917 777 8888',
  'customer_email', 'gateway@test.ph',
  'order_type', 'pickup_delivery',
  'service_area_id', (select id from public.service_areas where name = 'Poblacion'),
  'pickup_date', to_char((now() at time zone 'Asia/Manila')::date + 1, 'YYYY-MM-DD'),
  'pickup_slot_id', (select id from public.time_slots order by sort_order limit 1),
  'delivery_date', to_char((now() at time zone 'Asia/Manila')::date + 2, 'YYYY-MM-DD'),
  'address', jsonb_build_object('line1', '12B Mabini Street', 'city', 'Makati City'),
  'payment_method', 'gcash',
  'selections', jsonb_build_array(
    jsonb_build_object('service_id', (select id from public.services where slug='wash-fold'), 'quantity', 5),
    jsonb_build_object('service_id', (select id from public.services where slug='fabric-conditioner'), 'quantity', 1)
  )
)) as result;
commit;

\echo 'expect subtotal 425 (5kg x 80 + 1 load x 25), fees 50+50, total 525:'
select o.subtotal, o.pickup_fee, o.delivery_fee, o.total_amount, o.status,
       (select count(*) from public.order_items i where i.order_id = o.id)   as items,
       (select count(*) from public.delivery_tasks t where t.order_id = o.id) as rider_legs
from public.orders o
where o.id = (select (result->>'order_id')::uuid from _booking);

\echo ''
\echo '=== TAMPERING IS REFUSED ==='
begin;
set local role anon;
\echo 'below the area minimum order (240 < 300) must fail:'
do $$
begin
  perform public.create_booking(jsonb_build_object(
    'customer_name', 'Cheap Test', 'customer_phone', '09170000001',
    'order_type', 'pickup_delivery',
    'service_area_id', (select id from public.service_areas where name = 'Poblacion'),
    'pickup_date', to_char((now() at time zone 'Asia/Manila')::date + 1, 'YYYY-MM-DD'),
    'pickup_slot_id', (select id from public.time_slots order by sort_order limit 1),
    'address', jsonb_build_object('line1', '12B Mabini Street', 'city', 'Makati'),
    'selections', jsonb_build_array(
      jsonb_build_object('service_id', (select id from public.services where slug='wash-fold'), 'quantity', 3))
  ));
  raise exception 'REGRESSION: below-minimum order was accepted';
exception when others then
  if sqlerrm like '%minimum order%' then
    raise notice 'refused as expected: %', sqlerrm;
  else raise;
  end if;
end $$;

\echo 'a made-up service id must fail:'
do $$
begin
  perform public.create_booking(jsonb_build_object(
    'customer_name', 'Fake Test', 'customer_phone', '09170000002',
    'order_type', 'dropoff',
    'pickup_date', to_char((now() at time zone 'Asia/Manila')::date + 1, 'YYYY-MM-DD'),
    'selections', jsonb_build_array(
      jsonb_build_object('service_id', gen_random_uuid(), 'quantity', 5))
  ));
  raise exception 'REGRESSION: unknown service was accepted';
exception when others then
  if sqlerrm like '%no longer available%' then
    raise notice 'refused as expected: %', sqlerrm;
  else raise;
  end if;
end $$;

-- Anon is refused on orders at the GRANT layer — selecting would raise
-- "permission denied", so assert the privilege itself.
\echo 'anon still cannot read the order it created (expect f):'
select has_table_privilege('anon', 'public.orders', 'SELECT') as anon_can_read_orders;
commit;
