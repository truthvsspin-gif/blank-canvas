-- Usage table
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  metric text not null,
  value numeric not null,
  occurred_at timestamptz not null default now(),
  period text,
  metadata jsonb default '{}'::jsonb
);

comment on table public.usage is 'Usage/telemetry events aggregated per tenant.';

alter table public.usage add column if not exists period text;

create index if not exists idx_usage_business on public.usage (business_id, metric, occurred_at desc);

create unique index if not exists idx_usage_unique_period on public.usage (business_id, metric, period);

alter table public.usage enable row level security;

drop policy if exists "Members can view usage" on public.usage;

create policy "Members can view usage" on public.usage
  for select using (public.is_member(business_id));

drop policy if exists "Members can insert usage" on public.usage;

create policy "Members can insert usage" on public.usage
  for insert with check (public.is_member(business_id));
