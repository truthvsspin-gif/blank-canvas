-- CRM MVP phase-2: validation workflow + work orders

-- Booking validation fields
alter table public.bookings add column if not exists validation_status text not null default 'pending';
alter table public.bookings add column if not exists validated_by uuid references public.users(id) on delete set null;
alter table public.bookings add column if not exists validated_at timestamptz;
alter table public.bookings add column if not exists rejected_reason text;

create index if not exists idx_bookings_validation_status on public.bookings (business_id, validation_status);

-- Normalize historical rows
update public.bookings
set validation_status = case
  when status in ('confirmed', 'in_progress', 'completed') then 'approved'
  when status in ('cancelled', 'no_show') then 'rejected'
  else 'pending'
end
where validation_status is null or validation_status = '';

-- Work orders table
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  service_name text not null,
  status text not null default 'open',
  assigned_to uuid references public.users(id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id)
);

comment on table public.work_orders is 'Operational work orders generated from approved bookings.';

create index if not exists idx_work_orders_business on public.work_orders (business_id, status, scheduled_at);
create index if not exists idx_work_orders_assigned on public.work_orders (business_id, assigned_to, status);

alter table public.work_orders enable row level security;

drop policy if exists "Members select work orders" on public.work_orders;
create policy "Members select work orders" on public.work_orders
  for select using (public.is_member(business_id));

drop policy if exists "Members insert work orders" on public.work_orders;
create policy "Members insert work orders" on public.work_orders
  for insert with check (public.is_member(business_id));

drop policy if exists "Members update work orders" on public.work_orders;
create policy "Members update work orders" on public.work_orders
  for update using (public.is_member(business_id));

drop policy if exists "Members delete work orders" on public.work_orders;
create policy "Members delete work orders" on public.work_orders
  for delete using (public.is_member(business_id));
