-- Monthly usage counters + conversation window tracking
create table if not exists public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  metric text not null,
  value numeric not null default 0,
  period text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, metric, period)
);

comment on table public.usage_monthly is 'Monthly usage counters per business.';

create index if not exists idx_usage_monthly_business on public.usage_monthly (business_id, period);

alter table public.usage_monthly enable row level security;
drop policy if exists "Members select usage monthly" on public.usage_monthly;
create policy "Members select usage monthly" on public.usage_monthly
  for select using (public.is_member(business_id));
drop policy if exists "Members insert usage monthly" on public.usage_monthly;
create policy "Members insert usage monthly" on public.usage_monthly
  for insert with check (public.is_member(business_id));
drop policy if exists "Members update usage monthly" on public.usage_monthly;
create policy "Members update usage monthly" on public.usage_monthly
  for update using (public.is_member(business_id));

alter table public.inbox_threads add column if not exists last_usage_window_at timestamptz;
