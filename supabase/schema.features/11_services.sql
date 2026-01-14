-- Services table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  base_price numeric,
  duration_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.services is 'Catalog of services per business.';

create index if not exists idx_services_business on public.services (business_id, is_active);

alter table public.services enable row level security;

drop policy if exists "Members select services" on public.services;

create policy "Members select services" on public.services
  for select using (public.is_member(business_id));

drop policy if exists "Members insert services" on public.services;

create policy "Members insert services" on public.services
  for insert with check (public.is_member(business_id));

drop policy if exists "Members update services" on public.services;

create policy "Members update services" on public.services
  for update using (public.is_member(business_id));

drop policy if exists "Members delete services" on public.services;

create policy "Members delete services" on public.services
  for delete using (public.is_member(business_id));
