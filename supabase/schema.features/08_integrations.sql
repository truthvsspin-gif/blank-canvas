-- Business integrations (secret tokens + ids)
create table if not exists public.business_integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  whatsapp_access_token text,
  whatsapp_phone_number_id text,
  instagram_access_token text,
  instagram_business_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

comment on table public.business_integrations is 'Per-business integration credentials for messaging providers.';

create index if not exists idx_integrations_business on public.business_integrations (business_id);

alter table public.business_integrations enable row level security;

drop policy if exists "Owners view integrations" on public.business_integrations;

create policy "Owners view integrations" on public.business_integrations
  for select using (public.is_member(business_id));

drop policy if exists "Owners manage integrations" on public.business_integrations;

create policy "Owners manage integrations" on public.business_integrations
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));
