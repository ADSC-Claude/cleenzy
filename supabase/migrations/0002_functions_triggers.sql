-- Cleenzy — derived values, order numbering, audit trail

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch      before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger services_touch      before update on public.services
  for each row execute function public.touch_updated_at();
create trigger delivery_tasks_touch before update on public.delivery_tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Order numbers: CLZ-20260821-0001, restarting each day.
-- ---------------------------------------------------------------------------

create table public.order_counters (
  day date primary key,
  seq int not null default 0
);

create or replace function public.next_order_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  n int;
begin
  insert into public.order_counters as c (day, seq)
  values (today, 1)
  on conflict (day) do update set seq = c.seq + 1
  returning seq into n;

  return 'CLZ-' || to_char(today, 'YYYYMMDD') || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Money: one place derives the total and the payment status, so admin edits
-- to fees, charges or discounts can never drift from the line items.
-- ---------------------------------------------------------------------------

create or replace function public.derive_order_amounts()
returns trigger language plpgsql as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.next_order_number();
  end if;

  new.total_amount :=
      coalesce(new.subtotal, 0)
    + coalesce(new.pickup_fee, 0)
    + coalesce(new.delivery_fee, 0)
    + coalesce(new.additional_charges, 0)
    - coalesce(new.discount_amount, 0);

  if new.total_amount < 0 then
    new.total_amount := 0;
  end if;

  -- Refunds are set explicitly by staff and must not be recomputed away.
  if new.payment_status is distinct from 'refunded' then
    if coalesce(new.amount_paid, 0) <= 0 then
      new.payment_status := 'unpaid';
    elsif new.amount_paid >= new.total_amount then
      new.payment_status := 'paid';
    else
      new.payment_status := 'partial';
    end if;
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  if new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_derive_amounts
  before insert or update on public.orders
  for each row execute function public.derive_order_amounts();

-- Line item totals honour the actual weighed quantity once staff record it.
create or replace function public.derive_item_total()
returns trigger language plpgsql as $$
begin
  new.line_total := round(
    coalesce(new.actual_quantity, new.quantity) * new.unit_price, 2
  );
  return new;
end;
$$;

create trigger order_items_derive_total
  before insert or update on public.order_items
  for each row execute function public.derive_item_total();

create or replace function public.recalc_order_subtotal()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders o
     set subtotal = coalesce(
           (select sum(i.line_total) from public.order_items i where i.order_id = target), 0
         )
   where o.id = target;
  return null;
end;
$$;

create trigger order_items_recalc
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_subtotal();

create or replace function public.recalc_order_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders o
     set amount_paid = coalesce(
           (select sum(p.amount) from public.payments p where p.order_id = target), 0
         )
   where o.id = target;
  return null;
end;
$$;

create trigger payments_recalc
  after insert or update or delete on public.payments
  for each row execute function public.recalc_order_payment();

-- ---------------------------------------------------------------------------
-- Status audit trail — feeds both the customer timeline and admin history.
-- ---------------------------------------------------------------------------

create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return null;
end;
$$;

create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- ---------------------------------------------------------------------------
-- Profile bootstrap: every auth user gets a profile, defaulting to customer.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
