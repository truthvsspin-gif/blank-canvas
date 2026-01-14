-- Notes table for timelines
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  entity_type text not null check (entity_type in ('customer', 'booking')),
  entity_id uuid not null,
  message text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_business on public.notes (business_id, entity_type, entity_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "Members select notes" on public.notes;

create policy "Members select notes" on public.notes
  for select using (public.is_member(business_id));

drop policy if exists "Members insert notes" on public.notes;

create policy "Members insert notes" on public.notes
  for insert with check (public.is_member(business_id));
