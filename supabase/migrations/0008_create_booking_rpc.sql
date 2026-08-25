-- Cleenzy — booking without the service-role key.
--
-- Guest bookings previously required the service-role key on the web server,
-- because anon deliberately holds no insert rights on orders. This function
-- replaces that: a security-definer gateway, like track_order, that performs
-- the whole insert itself. Every price, minimum and fee is recomputed from
-- the database inside the function, so a caller who invokes it directly can
-- only ever create a legitimately-priced order — exactly what the booking
-- form produces.

create or replace function public.create_booking(p jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name          text := trim(coalesce(p->>'customer_name', ''));
  v_phone         text := regexp_replace(coalesce(p->>'customer_phone', ''), '\D', '', 'g');
  v_email         text := nullif(trim(coalesce(p->>'customer_email', '')), '');
  v_type          public.order_type;
  v_area          public.service_areas%rowtype;
  v_area_id       uuid := nullif(p->>'service_area_id', '')::uuid;
  v_pickup_date   date := nullif(p->>'pickup_date', '')::date;
  v_pickup_slot   uuid := nullif(p->>'pickup_slot_id', '')::uuid;
  v_delivery_date date := nullif(p->>'delivery_date', '')::date;
  v_delivery_slot uuid := nullif(p->>'delivery_slot_id', '')::uuid;
  v_payment       public.payment_method;
  v_notes         text := nullif(trim(coalesce(p->>'notes', '')), '');
  v_addr          jsonb := p->'address';
  v_is_pickup     boolean;
  v_address_id    uuid;
  v_order_id      uuid;
  v_order_number  text;
  v_subtotal      numeric := 0;
  v_pickup_fee    numeric := 0;
  v_delivery_fee  numeric := 0;
  v_est_weight    numeric := 0;
  v_today         date := (now() at time zone 'Asia/Manila')::date;
  sel             jsonb;
  v_svc           public.services%rowtype;
  v_qty           numeric;
  v_billed        numeric;
begin
  begin
    v_type := coalesce(p->>'order_type', 'pickup_delivery')::public.order_type;
    v_payment := coalesce(p->>'payment_method', 'cash')::public.payment_method;
  exception when others then
    raise exception 'Please check the form and try again.';
  end;
  v_is_pickup := v_type = 'pickup_delivery';

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Please enter your name.';
  end if;
  if length(v_phone) < 10 or length(v_phone) > 12 then
    raise exception 'Enter a valid mobile number.';
  end if;
  if v_email is not null and (length(v_email) > 200 or v_email !~ '^\S+@\S+\.\S+$') then
    raise exception 'Enter a valid email address.';
  end if;
  if length(coalesce(v_notes, '')) > 500 then
    raise exception 'Notes are limited to 500 characters.';
  end if;
  if jsonb_typeof(p->'selections') is distinct from 'array'
     or jsonb_array_length(p->'selections') = 0 then
    raise exception 'Choose at least one service.';
  end if;
  if jsonb_array_length(p->'selections') > 20 then
    raise exception 'Too many services in one order.';
  end if;

  if v_is_pickup then
    if v_pickup_date is null or v_pickup_slot is null then
      raise exception 'Choose a pickup date and time slot.';
    end if;
    if v_addr is null or length(trim(coalesce(v_addr->>'line1', ''))) < 5 then
      raise exception 'Enter your house number and street.';
    end if;
    if length(trim(coalesce(v_addr->>'city', ''))) < 2 then
      raise exception 'Enter your city.';
    end if;
    if v_area_id is not null then
      select * into v_area from public.service_areas
      where id = v_area_id and is_active;
      if not found then
        raise exception 'That coverage area is no longer available.';
      end if;
      v_pickup_fee := v_area.pickup_fee;
      v_delivery_fee := v_area.delivery_fee;
    end if;
  elsif v_pickup_date is null then
    raise exception 'Choose a drop-off date.';
  end if;

  if v_pickup_date < v_today then
    raise exception 'That date has already passed.';
  end if;
  if v_pickup_date > v_today + 60 then
    raise exception 'Pick a date within the next 60 days.';
  end if;
  if v_delivery_date is not null and v_delivery_date < v_pickup_date then
    raise exception 'Delivery cannot be before pickup.';
  end if;

  if v_pickup_slot is not null and not exists (
    select 1 from public.time_slots where id = v_pickup_slot and is_active
  ) then
    raise exception 'That pickup time slot is no longer available.';
  end if;
  if v_delivery_slot is not null and not exists (
    select 1 from public.time_slots where id = v_delivery_slot and is_active
  ) then
    raise exception 'That delivery time slot is no longer available.';
  end if;

  -- Money comes from the database only; the payload contributes quantities.
  for sel in select * from jsonb_array_elements(p->'selections') loop
    v_qty := (sel->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 or v_qty > 500 then
      raise exception 'Quantity must be between 0 and 500.';
    end if;
    select * into v_svc from public.services
    where id = (sel->>'service_id')::uuid and is_active;
    if not found then
      raise exception 'A selected service is no longer available.';
    end if;
    v_billed := greatest(v_qty, v_svc.min_quantity);
    v_subtotal := v_subtotal + round(v_billed * v_svc.price, 2);
    if v_svc.unit = 'per_kg' then
      v_est_weight := v_est_weight + v_billed;
    end if;
  end loop;

  if v_is_pickup and v_area_id is not null then
    if v_area.min_order_amount > 0 and v_subtotal < v_area.min_order_amount then
      raise exception 'Pickup in % needs a minimum order of ₱%. Add more items or drop off at the shop.',
        v_area.name, v_area.min_order_amount;
    end if;
    if v_area.free_delivery_over is not null and v_subtotal >= v_area.free_delivery_over then
      v_delivery_fee := 0;
    end if;
  end if;

  if v_is_pickup then
    insert into public.addresses
      (customer_id, label, recipient_name, phone, line1, barangay, city, landmark, service_area_id)
    values
      (null, 'Home', v_name, v_phone,
       trim(v_addr->>'line1'),
       nullif(trim(coalesce(v_addr->>'barangay', '')), ''),
       trim(v_addr->>'city'),
       nullif(trim(coalesce(v_addr->>'landmark', '')), ''),
       v_area_id)
    returning id into v_address_id;
  end if;

  insert into public.orders
    (order_number, customer_id, customer_name, customer_phone, customer_email,
     order_type, status, payment_method,
     pickup_date, pickup_slot_id, pickup_address_id,
     delivery_date, delivery_slot_id, delivery_address_id, service_area_id,
     estimated_weight_kg, pickup_fee, delivery_fee, notes)
  values
    ('', null, v_name, v_phone, v_email, v_type, 'placed', v_payment,
     v_pickup_date, case when v_is_pickup then v_pickup_slot end, v_address_id,
     v_delivery_date, case when v_is_pickup then v_delivery_slot end, v_address_id,
     case when v_is_pickup then v_area_id end,
     nullif(v_est_weight, 0), v_pickup_fee, v_delivery_fee, v_notes)
  returning id, order_number into v_order_id, v_order_number;

  -- Line items snapshot database prices; the triggers derive the totals.
  insert into public.order_items (order_id, service_id, service_name, unit, unit_price, quantity)
  select v_order_id, s.id, s.name, s.unit, s.price,
         greatest((e->>'quantity')::numeric, s.min_quantity)
  from jsonb_array_elements(p->'selections') e
  join public.services s on s.id = (e->>'service_id')::uuid;

  if v_is_pickup then
    insert into public.delivery_tasks (order_id, task_type, scheduled_date, slot_id, address_id, status)
    values (v_order_id, 'pickup', v_pickup_date, v_pickup_slot, v_address_id, 'assigned');
    if v_delivery_date is not null then
      insert into public.delivery_tasks (order_id, task_type, scheduled_date, slot_id, address_id, status)
      values (v_order_id, 'delivery', v_delivery_date,
              coalesce(v_delivery_slot, v_pickup_slot), v_address_id, 'assigned');
    end if;
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
end;
$$;

revoke all on function public.create_booking(jsonb) from public;
grant execute on function public.create_booking(jsonb) to anon, authenticated;
