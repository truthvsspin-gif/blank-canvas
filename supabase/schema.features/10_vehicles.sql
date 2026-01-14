-- Vehicles table (multiple vehicles per customer)
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  brand text,
  model text,
  color text,
  license_plate text,
  size text,
  created_at timestamptz not null default now()
);

comment on table public.vehicles is 'Customer vehicles scoped by business.';

create index if not exists idx_vehicles_business on public.vehicles (business_id, customer_id, created_at desc);

alter table public.vehicles enable row level security;

drop policy if exists "Members select vehicles" on public.vehicles;

create policy "Members select vehicles" on public.vehicles
  for select using (public.is_member(business_id));

drop policy if exists "Members insert vehicles" on public.vehicles;

create policy "Members insert vehicles" on public.vehicles
  for insert with check (public.is_member(business_id));

drop policy if exists "Members update vehicles" on public.vehicles;

create policy "Members update vehicles" on public.vehicles
  for update using (public.is_member(business_id));

drop policy if exists "Members delete vehicles" on public.vehicles;

create policy "Members delete vehicles" on public.vehicles
  for delete using (public.is_member(business_id));
