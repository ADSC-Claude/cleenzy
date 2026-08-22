-- Cleenzy — Phase 1 core schema
-- Laundry pickup/delivery platform for the Philippine market.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum (
  'owner', 'manager', 'laundry_staff', 'cashier', 'rider', 'customer'
);

create type public.service_unit as enum (
  'per_kg', 'per_piece', 'per_pair', 'per_load'
);

create type public.order_type as enum ('pickup_delivery', 'dropoff');

-- Single source of truth for both the customer timeline and the laundry
-- Kanban board. The board renders received..packed; the customer timeline
-- collapses quality_check/packed into a friendly "Ready".
create type public.order_status as enum (
  'placed',
  'pickup_scheduled',
  'picked_up',
  'received',
  'sorting',
  'washing',
  'drying',
  'folding',
  'quality_check',
  'packed',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled'
);

create type public.payment_status as enum ('unpaid', 'partial', 'paid', 'refunded');

create type public.payment_method as enum ('cash', 'gcash', 'bank_transfer', 'card');

create type public.task_type as enum ('pickup', 'delivery');

create type public.task_status as enum (
  'assigned', 'en_route', 'picked_up', 'delivered', 'failed'
);

create type public.slot_type as enum ('pickup', 'delivery', 'both');

create type public.notification_channel as enum ('email', 'sms', 'app');

create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  phone        text,
  email        text,
  role         public.user_role not null default 'customer',
  is_active    boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where is_active;
create index profiles_phone_idx on public.profiles (phone);

-- ---------------------------------------------------------------------------
-- Catalogue & configuration
-- ---------------------------------------------------------------------------

create table public.service_areas (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  city              text not null,
  pickup_fee        numeric(10,2) not null default 0 check (pickup_fee >= 0),
  delivery_fee      numeric(10,2) not null default 0 check (delivery_fee >= 0),
  min_order_amount  numeric(10,2) not null default 0 check (min_order_amount >= 0),
  free_delivery_over numeric(10,2),
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text not null default '',
  price            numeric(10,2) not null check (price >= 0),
  unit             public.service_unit not null,
  turnaround_hours int not null default 24 check (turnaround_hours > 0),
  min_quantity     numeric(10,2) not null default 1 check (min_quantity > 0),
  icon             text,
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index services_active_idx on public.services (sort_order) where is_active;

create table public.time_slots (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  start_time time not null,
  end_time   time not null,
  slot_type  public.slot_type not null default 'both',
  capacity   int not null default 20 check (capacity > 0),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  check (end_time > start_time)
);

create table public.settings (
  key        text primary key,
  value      jsonb not null,
  -- Public settings (contact details, fees, hours) are readable by the
  -- website; everything else stays behind an owner/manager check.
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------

create table public.addresses (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references public.profiles(id) on delete cascade,
  label           text not null default 'Home',
  recipient_name  text not null,
  phone           text not null,
  line1           text not null,
  barangay        text,
  city            text not null,
  province        text,
  postal_code     text,
  landmark        text,
  notes           text,
  service_area_id uuid references public.service_areas(id) on delete set null,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index addresses_customer_idx on public.addresses (customer_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,

  -- Guest-capable: customer_id is null for walk-ins and guest bookings, so
  -- contact details are stored on the order itself.
  customer_id         uuid references public.profiles(id) on delete set null,
  customer_name       text not null,
  customer_phone      text not null,
  customer_email      text,

  order_type          public.order_type not null default 'pickup_delivery',
  status              public.order_status not null default 'placed',
  payment_status      public.payment_status not null default 'unpaid',
  payment_method      public.payment_method not null default 'cash',

  pickup_date         date,
  pickup_slot_id      uuid references public.time_slots(id) on delete set null,
  pickup_address_id   uuid references public.addresses(id) on delete set null,
  delivery_date       date,
  delivery_slot_id    uuid references public.time_slots(id) on delete set null,
  delivery_address_id uuid references public.addresses(id) on delete set null,
  service_area_id     uuid references public.service_areas(id) on delete set null,

  estimated_weight_kg numeric(10,2),
  actual_weight_kg    numeric(10,2),

  subtotal            numeric(10,2) not null default 0,
  pickup_fee          numeric(10,2) not null default 0,
  delivery_fee        numeric(10,2) not null default 0,
  additional_charges  numeric(10,2) not null default 0,
  charges_reason      text,
  discount_amount     numeric(10,2) not null default 0,
  discount_reason     text,
  total_amount        numeric(10,2) not null default 0,
  amount_paid         numeric(10,2) not null default 0,

  assigned_staff_id   uuid references public.profiles(id) on delete set null,
  assigned_rider_id   uuid references public.profiles(id) on delete set null,

  notes               text,
  internal_notes      text,

  placed_at           timestamptz not null default now(),
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint orders_amounts_non_negative check (
    subtotal >= 0 and pickup_fee >= 0 and delivery_fee >= 0
    and additional_charges >= 0 and discount_amount >= 0 and amount_paid >= 0
  )
);

create index orders_status_idx        on public.orders (status);
create index orders_customer_idx      on public.orders (customer_id);
create index orders_phone_idx         on public.orders (customer_phone);
create index orders_pickup_date_idx   on public.orders (pickup_date);
create index orders_delivery_date_idx on public.orders (delivery_date);
create index orders_placed_at_idx     on public.orders (placed_at desc);
create index orders_rider_idx         on public.orders (assigned_rider_id);

-- Line items snapshot the service name, price and unit at time of order so
-- that later price changes never rewrite historical receipts or reports.
create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  service_id      uuid references public.services(id) on delete set null,
  service_name    text not null,
  unit            public.service_unit not null,
  unit_price      numeric(10,2) not null check (unit_price >= 0),
  quantity        numeric(10,2) not null check (quantity > 0),
  actual_quantity numeric(10,2) check (actual_quantity >= 0),
  line_total      numeric(10,2) not null default 0,
  created_at      timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  changed_by  uuid references public.profiles(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- One order has two independent rider legs (pickup and delivery) that may be
-- run by different riders on different days, so they live in their own rows.
create table public.delivery_tasks (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  task_type      public.task_type not null,
  rider_id       uuid references public.profiles(id) on delete set null,
  scheduled_date date,
  slot_id        uuid references public.time_slots(id) on delete set null,
  address_id     uuid references public.addresses(id) on delete set null,
  status         public.task_status not null default 'assigned',
  cod_amount     numeric(10,2) not null default 0 check (cod_amount >= 0),
  sequence       int not null default 0,
  notes          text,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (order_id, task_type)
);

create index delivery_tasks_rider_idx on public.delivery_tasks (rider_id, scheduled_date);
create index delivery_tasks_date_idx  on public.delivery_tasks (scheduled_date, task_type);

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  amount           numeric(10,2) not null check (amount > 0),
  method           public.payment_method not null,
  reference_number text,
  received_by      uuid references public.profiles(id) on delete set null,
  paid_at          timestamptz not null default now(),
  notes            text,
  gateway_payload  jsonb,
  created_at       timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);
create index payments_paid_at_idx on public.payments (paid_at desc);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  channel      public.notification_channel not null,
  template_key text not null,
  to_address   text not null,
  status       public.notification_status not null default 'queued',
  payload      jsonb,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_order_idx on public.notifications (order_id, created_at desc);
