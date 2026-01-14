-- Businesses table
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  owner_user_id uuid references public.users(id) on delete set null,
  language_preference text,
  office_hours text,
  booking_rules jsonb default '{}'::jsonb,
  chatbot_enabled boolean not null default true,
  greeting_message text,
  ai_reply_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.businesses is 'Tenant/workspace container.';

alter table public.businesses add column if not exists language_preference text;

alter table public.businesses add column if not exists office_hours text;

alter table public.businesses add column if not exists booking_rules jsonb default '{}'::jsonb;

alter table public.businesses add column if not exists chatbot_enabled boolean not null default true;

alter table public.businesses add column if not exists greeting_message text;
alter table public.businesses add column if not exists ai_reply_enabled boolean not null default false;

alter table public.businesses add column if not exists auto_reply_rules jsonb default '{}'::jsonb;

alter table public.businesses enable row level security;

drop policy if exists "Members can view business" on public.businesses;

create policy "Members can view business" on public.businesses
  for select using (owner_user_id = auth.uid() or public.is_member(id));

drop policy if exists "Owners can update business" on public.businesses;

create policy "Owners can update business" on public.businesses
  for update using (owner_user_id = auth.uid());

drop policy if exists "Owners can add members" on public.businesses;

create policy "Owners can add members" on public.businesses
  for insert with check (owner_user_id = auth.uid());
