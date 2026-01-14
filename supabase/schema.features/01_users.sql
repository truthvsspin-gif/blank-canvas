-- Users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Application users (auth mapped separately).';

-- Row Level Security (RLS) placeholders
alter table public.users enable row level security;

drop policy if exists "Users can manage themselves" on public.users;

create policy "Users can manage themselves" on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());
