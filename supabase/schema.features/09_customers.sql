-- Customers table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  vehicle_info text,
  tags text[],
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.customers is 'CRM customers scoped by business.';

-- Indexes
create index if not exists idx_customers_business on public.customers (business_id);

-- RLS for new tables: member-only access by business_id
alter table public.customers enable row level security;

drop policy if exists "Members select customers" on public.customers;

create policy "Members select customers" on public.customers
  for select using (public.is_member(business_id));

drop policy if exists "Members insert customers" on public.customers;

create policy "Members insert customers" on public.customers
  for insert with check (public.is_member(business_id));

drop policy if exists "Members update customers" on public.customers;

create policy "Members update customers" on public.customers
  for update using (public.is_member(business_id));

drop policy if exists "Members delete customers" on public.customers;

create policy "Members delete customers" on public.customers
  for delete using (public.is_member(business_id));
