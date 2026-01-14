-- Bookings table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  service_name text not null,
  price numeric,
  status text not null default 'pending',
  scheduled_at timestamptz,
  source text,
  created_at timestamptz not null default now()
);

comment on table public.bookings is 'Appointments / bookings linked to customers and business.';

create index if not exists idx_bookings_business on public.bookings (business_id, scheduled_at);

alter table public.bookings enable row level security;

drop policy if exists "Members select bookings" on public.bookings;

create policy "Members select bookings" on public.bookings
  for select using (public.is_member(business_id));

drop policy if exists "Members insert bookings" on public.bookings;

create policy "Members insert bookings" on public.bookings
  for insert with check (public.is_member(business_id));

drop policy if exists "Members update bookings" on public.bookings;

create policy "Members update bookings" on public.bookings
  for update using (public.is_member(business_id));

drop policy if exists "Members delete bookings" on public.bookings;

create policy "Members delete bookings" on public.bookings
  for delete using (public.is_member(business_id));
