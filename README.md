# Cleenzy

Laundry pickup, delivery and shop management for a Philippine laundry business.
One Next.js app serves both the customer website and the staff admin system.

**Phase 1 (this build).** Landing page, services and pricing, online booking,
pickup and delivery scheduling, order tracking, payment recording, admin
dashboard, order management, laundry queue, pickup/delivery queues, rider view,
customer list, pricing configuration, and email/SMS confirmations.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Database, auth, realtime | Supabase (Postgres 17) |
| Email | Resend |
| SMS | Semaphore (Philippine gateway) |

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in your Supabase keys
npm run dev
```

The app runs without a database — pages render an honest "not connected yet"
notice rather than crashing — but nothing can be booked until you complete the
setup below.

### 1. Create a Supabase project

Any region works; `ap-southeast-1` (Singapore) is the closest to the
Philippines. Copy the project URL, anon key and service-role key into
`.env.local`.

### 2. Apply the migrations

Run the four files in `supabase/migrations/` in order, either through the
Supabase SQL editor or with the CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

| File | What it creates |
|---|---|
| `0001_init_schema.sql` | Enums and tables |
| `0002_functions_triggers.sql` | Order numbering, derived totals, audit trail |
| `0003_rls.sql` | Row level security, restricted views, tracking RPC |
| `0004_seed.sql` | Starting services, time slots, coverage areas, settings |

### 3. Create the first owner

Staff sign up through `/signup` like anyone else and start as customers. Promote
the first account by hand, then use **Admin › Staff** for everyone after that:

```sql
update public.profiles set role = 'owner' where email = 'you@example.com';
```

### 4. Notifications (optional)

Email sends as soon as `RESEND_API_KEY` is present. SMS stays dormant until
`SEMAPHORE_API_KEY` is set — Semaphore sender IDs need approval in the
Philippines, which takes a few days, so the adapter is written and tested but
switched off. Without either key, notifications are recorded to the database and
logged rather than sent, so nothing breaks in development.

## Verifying the database

`supabase/tests/` applies every migration to a throwaway local Postgres and
exercises the parts worth being sure about: order totals, re-weighing,
payment status, order numbering, and the whole access model including two
negative cases.

```bash
# with a local postgres listening on port 5433
bash supabase/tests/run.sh
```

## How it is put together

### One status enum, two views of it

`order_status` is the single source of truth. The admin Kanban renders
`received → packed`; the customer timeline collapses `quality_check` and
`packed` into a friendly "Ready" and drops the pickup steps entirely for
drop-off orders. Because both read the same column, an admin action cannot
drift from what the customer sees. The mapping lives in `src/lib/status.ts`.

### Prices are never trusted from the browser

The booking wizard sends *choices* — which services, what quantities. The server
re-reads rates, minimums and area fees from the database and recomputes the
total in `src/lib/pricing.ts`. A tampered payload changes nothing.

Line items snapshot the service name and price at the time of order, so raising
a price later never rewrites historical receipts or reports.

### Access is enforced in Postgres, not the UI

| Role | Reach |
|---|---|
| Owner | Everything |
| Manager | Orders, customers, reports, staff — not settings |
| Cashier | Orders and payments — no reports |
| Laundry staff | Laundry queue only |
| Rider | Own assigned pickups and deliveries only |
| Customer | Own orders only |

Laundry staff have **no select policy on `public.orders` at all**. They read the
`laundry_queue` view, which has no money columns, and move work through
`advance_order_status()`, which refuses any status outside the laundry stages.
Riders read `rider_tasks`, filtered to their own rows inside the view itself.
`supabase/tests/02_rls.sql` proves each of these, including that a rider cannot
update another rider's leg.

Guest bookings are written server-side with the service role, so `anon` never
holds insert rights on orders. Guest tracking needs the order number **and** the
phone number on the order, so order numbers cannot be enumerated.

### Live updates

Admin screens pair a Supabase Realtime subscription with a slow interval
(`src/lib/use-live-refresh.ts`). The interval is not redundant: Realtime honours
RLS, so laundry staff — who deliberately cannot read `orders` — receive no
events, and polling is what keeps their board current. The public tracking page
polls the phone-gated RPC for the same reason.

## Project layout

```
src/app/(site)/         Customer website
  page.tsx              Landing
  services/             Services & pricing
  book/                 Booking wizard + server action
  track/                Order tracking
  account/              Customer dashboard
  contact/              Contact & FAQ
src/app/admin/          Staff admin
  page.tsx              Dashboard
  orders/               List, editor, walk-in intake, thermal receipt
  queue/                Laundry Kanban
  logistics/            Pickup & delivery queues
  rider/                Rider run sheet
  services/ payments/ customers/ reports/ staff/ settings/
src/lib/                Pricing, status model, formatting, auth, notifications
supabase/migrations/    Schema, triggers, RLS, seed
supabase/tests/         Local verification harness
```

## Receipts

`/admin/orders/[id]/receipt` prints on 58mm and 80mm thermal rolls. The width
toggle changes the layout; the admin chrome is hidden at print time.

## Not in Phase 1

Loyalty points, promo codes, recurring subscriptions, a rider mobile app,
multi-branch, inventory, POS and route optimisation are Phase 2 and 3. Card
payments are stubbed behind a setting: the booking flow records the customer's
chosen method and staff record the actual payment, so wiring a gateway such as
PayMongo later needs no schema change.
