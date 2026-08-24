-- Cleenzy — role helpers, row level security, restricted views
--
-- Enforcement model
--   owner          everything
--   manager        orders, customers, reports, staff — not settings
--   cashier        orders + payments, no reports
--   laundry_staff  no direct read of orders at all; sees the money-free
--                  laundry_queue view and moves work via advance_order_status()
--   rider          only their own delivery_tasks, via rider_tasks
--   customer       only their own orders
--
-- Guest bookings are written server-side with the service role, so anon is
-- never granted insert on orders.

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so policies on profiles do not recurse)
-- ---------------------------------------------------------------------------

create or replace function public.auth_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.has_role(variadic roles public.user_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = any(roles)
  )
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.has_role('owner', 'manager')
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role <> 'customer'
  )
$$;

-- Roles allowed to see money on an order.
create or replace function public.can_see_finance()
returns boolean language sql stable as $$
  select public.has_role('owner', 'manager', 'cashier')
$$;

-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.service_areas        enable row level security;
alter table public.services             enable row level security;
alter table public.time_slots           enable row level security;
alter table public.settings             enable row level security;
alter table public.addresses            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.delivery_tasks       enable row level security;
alter table public.payments             enable row level security;
alter table public.notifications        enable row level security;
alter table public.order_counters       enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());
create policy profiles_staff_read on public.profiles
  for select using (public.is_staff());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.auth_role());
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public catalogue — the website reads these anonymously
-- ---------------------------------------------------------------------------

create policy services_public_read on public.services
  for select using (is_active or public.is_staff());
create policy services_admin_write on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy areas_public_read on public.service_areas
  for select using (is_active or public.is_staff());
create policy areas_admin_write on public.service_areas
  for all using (public.is_admin()) with check (public.is_admin());

create policy slots_public_read on public.time_slots
  for select using (is_active or public.is_staff());
create policy slots_admin_write on public.time_slots
  for all using (public.is_admin()) with check (public.is_admin());

create policy settings_read on public.settings
  for select using (is_public or public.is_admin());
create policy settings_owner_write on public.settings
  for all using (public.has_role('owner')) with check (public.has_role('owner'));

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------

create policy addresses_own on public.addresses
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy addresses_staff_read on public.addresses
  for select using (public.is_staff());
create policy addresses_staff_write on public.addresses
  for all using (public.has_role('owner', 'manager', 'cashier'))
  with check (public.has_role('owner', 'manager', 'cashier'));

-- ---------------------------------------------------------------------------
-- Orders — note the deliberate absence of laundry_staff and rider
-- ---------------------------------------------------------------------------

create policy orders_customer_read on public.orders
  for select using (customer_id = auth.uid());
create policy orders_finance_read on public.orders
  for select using (public.can_see_finance());
create policy orders_finance_write on public.orders
  for all using (public.can_see_finance()) with check (public.can_see_finance());

create policy order_items_customer_read on public.order_items
  for select using (exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
  ));
create policy order_items_finance_all on public.order_items
  for all using (public.can_see_finance()) with check (public.can_see_finance());

create policy history_customer_read on public.order_status_history
  for select using (exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
  ));
create policy history_staff_read on public.order_status_history
  for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Logistics
-- ---------------------------------------------------------------------------

create policy tasks_rider_read on public.delivery_tasks
  for select using (rider_id = auth.uid());
create policy tasks_rider_update on public.delivery_tasks
  for update using (rider_id = auth.uid()) with check (rider_id = auth.uid());
create policy tasks_staff_all on public.delivery_tasks
  for all using (public.has_role('owner', 'manager', 'cashier'))
  with check (public.has_role('owner', 'manager', 'cashier'));

-- ---------------------------------------------------------------------------
-- Money — cashier and up only, so laundry staff and riders cannot read it
-- ---------------------------------------------------------------------------

create policy payments_customer_read on public.payments
  for select using (exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
  ));
create policy payments_finance_all on public.payments
  for all using (public.can_see_finance()) with check (public.can_see_finance());

create policy notifications_admin_read on public.notifications
  for select using (public.is_admin());

-- order_counters is written only by next_order_number() (security definer);
-- RLS is on with no policy, so no client can read or write it directly.

-- ---------------------------------------------------------------------------
-- Laundry queue: the only orders surface laundry staff can reach.
-- Runs with definer rights, so the role check inside the view is the gate.
-- Financial columns are simply absent.
-- ---------------------------------------------------------------------------

create view public.laundry_queue
with (security_invoker = false) as
  select
    o.id,
    o.order_number,
    o.customer_name,
    o.status,
    o.order_type,
    o.estimated_weight_kg,
    o.actual_weight_kg,
    o.notes,
    o.assigned_staff_id,
    o.delivery_date,
    o.placed_at,
    o.updated_at,
    (
      select string_agg(i.service_name, ', ' order by i.created_at)
      from public.order_items i where i.order_id = o.id
    ) as services
  from public.orders o
  where o.status in (
      'received', 'sorting', 'washing', 'drying',
      'folding', 'quality_check', 'packed'
    )
    and public.has_role('owner', 'manager', 'laundry_staff');

grant select on public.laundry_queue to authenticated;

-- Rider board: own assignments only, with the COD figure they must collect
-- but no other financial detail.
create view public.rider_tasks
with (security_invoker = false) as
  select
    t.id,
    t.order_id,
    t.task_type,
    t.status,
    t.scheduled_date,
    t.sequence,
    t.cod_amount,
    t.notes,
    t.completed_at,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.payment_status,
    s.label as slot_label,
    a.line1, a.barangay, a.city, a.province, a.landmark
  from public.delivery_tasks t
  join public.orders o on o.id = t.order_id
  left join public.time_slots s on s.id = t.slot_id
  left join public.addresses a on a.id = t.address_id
  where t.rider_id = auth.uid()
     or public.has_role('owner', 'manager');

grant select on public.rider_tasks to authenticated;

-- ---------------------------------------------------------------------------
-- advance_order_status: how laundry staff move work without touching orders.
-- ---------------------------------------------------------------------------

create or replace function public.advance_order_status(
  p_order_id uuid,
  p_status   public.order_status,
  p_note     text default null
)
returns public.order_status
language plpgsql security definer set search_path = public as $$
declare
  laundry_states public.order_status[] := array[
    'received', 'sorting', 'washing', 'drying',
    'folding', 'quality_check', 'packed', 'ready'
  ]::public.order_status[];
begin
  if public.has_role('owner', 'manager', 'cashier') then
    null; -- full control over the lifecycle
  elsif public.has_role('laundry_staff') then
    if not (p_status = any(laundry_states)) then
      raise exception 'Laundry staff may only move orders within the laundry queue';
    end if;
  else
    raise exception 'Not authorised to change order status';
  end if;

  update public.orders set status = p_status where id = p_order_id;

  if p_note is not null then
    update public.order_status_history
       set note = p_note
     where id = (
       select id from public.order_status_history
       where order_id = p_order_id order by created_at desc limit 1
     );
  end if;

  return p_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guest order tracking: order number alone is not enough, the caller must
-- also know the phone number on the order, so numbers cannot be enumerated.
-- ---------------------------------------------------------------------------

create or replace function public.track_order(
  p_order_number text,
  p_phone        text
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if length(digits) < 7 then
    return null;
  end if;

  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'customer_name', o.customer_name,
    'payment_status', o.payment_status,
    'total_amount', o.total_amount,
    'placed_at', o.placed_at,
    'pickup_date', o.pickup_date,
    'delivery_date', o.delivery_date,
    'estimated_weight_kg', o.estimated_weight_kg,
    'actual_weight_kg', o.actual_weight_kg,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'service_name', i.service_name,
        'quantity', coalesce(i.actual_quantity, i.quantity),
        'unit', i.unit,
        'line_total', i.line_total
      ) order by i.created_at)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'to_status', h.to_status,
        'created_at', h.created_at,
        'note', h.note
      ) order by h.created_at)
      from public.order_status_history h where h.order_id = o.id
    ), '[]'::jsonb)
  )
  into result
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 7) = right(digits, 7);

  return result;
end;
$$;

grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.advance_order_status(uuid, public.order_status, text) to authenticated;
