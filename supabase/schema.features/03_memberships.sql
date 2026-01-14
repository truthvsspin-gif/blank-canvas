-- Memberships table (user-to-tenant with role)
create table if not exists public.memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

comment on table public.memberships is 'User membership and role per tenant.';

create index if not exists idx_memberships_user on public.memberships (user_id);

create index if not exists idx_memberships_business on public.memberships (business_id);

alter table public.memberships enable row level security;

drop policy if exists "Members can view their memberships" on public.memberships;

create policy "Members can view their memberships" on public.memberships
  for select using (auth.uid() = user_id);

drop policy if exists "Users can join a workspace" on public.memberships;

create policy "Users can join a workspace" on public.memberships
  for insert with check (auth.uid() = user_id);
