-- Leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text,
  phone text,
  conversation_id text,
  customer_id uuid references public.customers(id) on delete set null,
  name text,
  source text,
  stage text default 'new',
  qualification_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email)
);

comment on table public.leads is 'Lead/contact records per business.';

alter table public.leads add column if not exists phone text;

alter table public.leads add column if not exists conversation_id text;

alter table public.leads add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.leads add column if not exists qualification_reason text;

alter table public.leads alter column email drop not null;

create unique index if not exists idx_leads_business_conversation on public.leads (business_id, conversation_id);

create index if not exists idx_leads_business on public.leads (business_id);

alter table public.leads enable row level security;

drop policy if exists "Members can view leads" on public.leads;

create policy "Members can view leads" on public.leads
  for select using (public.is_member(business_id));

drop policy if exists "Members can insert leads" on public.leads;

create policy "Members can insert leads" on public.leads
  for insert with check (public.is_member(business_id));

drop policy if exists "Members can update leads" on public.leads;

create policy "Members can update leads" on public.leads
  for update using (public.is_member(business_id));
