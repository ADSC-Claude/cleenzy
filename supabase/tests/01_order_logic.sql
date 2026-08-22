\set ON_ERROR_STOP on
-- Guest order: Wash & Fold 5kg @80 = 400, + 50 pickup + 50 delivery - 100 discount
insert into public.orders (customer_name, customer_phone, customer_email, order_type,
                           pickup_fee, delivery_fee, discount_amount, discount_reason,
                           estimated_weight_kg, order_number)
values ('Maria Santos', '0917 555 1234', 'maria@example.com', 'pickup_delivery',
        50, 50, 100, 'First order promo', 5, '');

insert into public.order_items (order_id, service_id, service_name, unit, unit_price, quantity)
select o.id, s.id, s.name, s.unit, s.price, 5
from public.orders o, public.services s
where o.customer_name='Maria Santos' and s.slug='wash-fold';

\echo '--- after items (expect subtotal 400, total 400) ---'
select order_number, subtotal, pickup_fee, delivery_fee, discount_amount, total_amount, payment_status
from public.orders where customer_name='Maria Santos';

\echo '--- record partial payment 200 ---'
insert into public.payments (order_id, amount, method, reference_number)
select id, 200, 'gcash', 'GC123456' from public.orders where customer_name='Maria Santos';
select amount_paid, total_amount, payment_status from public.orders where customer_name='Maria Santos';

\echo '--- staff weighs it: actual 6.5kg (expect subtotal 520, total 520) ---'
update public.order_items set actual_quantity = 6.5
where order_id = (select id from public.orders where customer_name='Maria Santos');
select subtotal, total_amount, amount_paid, payment_status from public.orders where customer_name='Maria Santos';

\echo '--- pay the remaining 320 (expect paid) ---'
insert into public.payments (order_id, amount, method)
select id, 320, 'cash' from public.orders where customer_name='Maria Santos';
select amount_paid, total_amount, payment_status from public.orders where customer_name='Maria Santos';

\echo '--- status trail ---'
update public.orders set status='picked_up' where customer_name='Maria Santos';
update public.orders set status='washing'  where customer_name='Maria Santos';
select from_status, to_status from public.order_status_history
where order_id=(select id from public.orders where customer_name='Maria Santos') order by created_at;

\echo '--- order numbers increment per day ---'
insert into public.orders (customer_name, customer_phone, order_number) values ('Juan Cruz','09171112222','');
insert into public.orders (customer_name, customer_phone, order_number) values ('Ana Reyes','09173334444','');
select order_number from public.orders order by placed_at;

\echo '--- track_order: correct phone (last 7 digits match) ---'
select jsonb_pretty(public.track_order(
  (select order_number from public.orders where customer_name='Maria Santos'), '5551234'
)::jsonb) is not null as found;

\echo '--- track_order: wrong phone must return null ---'
select public.track_order(
  (select order_number from public.orders where customer_name='Maria Santos'), '9999999'
) is null as correctly_rejected;
