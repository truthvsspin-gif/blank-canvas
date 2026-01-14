-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  subject text,
  channel text,
  conversation_id text,
  sender_name text,
  sender_phone_or_handle text,
  message_text text,
  message_timestamp timestamptz,
  lead_id uuid,
  message_direction text default 'inbound',
  intent text,
  status text not null default 'open',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.conversations is 'Chat/AI/CRM conversation threads.';

-- Backfill-safe additions for message ingestion
alter table public.conversations add column if not exists channel text;

alter table public.conversations add column if not exists conversation_id text;

alter table public.conversations add column if not exists sender_name text;

alter table public.conversations add column if not exists sender_phone_or_handle text;

alter table public.conversations add column if not exists message_text text;

alter table public.conversations add column if not exists message_timestamp timestamptz;

alter table public.conversations add column if not exists lead_id uuid;

alter table public.conversations add column if not exists message_direction text default 'inbound';
alter table public.conversations add column if not exists intent text;

-- Indexes for common lookups
create index if not exists idx_conversations_business on public.conversations (business_id);

create index if not exists idx_conversations_channel on public.conversations (channel);

create index if not exists idx_conversations_conversation on public.conversations (conversation_id);

create index if not exists idx_conversations_message_ts on public.conversations (message_timestamp desc);

create index if not exists idx_conversations_lead on public.conversations (lead_id);

create index if not exists idx_conversations_direction on public.conversations (message_direction);

alter table public.conversations enable row level security;

drop policy if exists "Members can view conversations" on public.conversations;

create policy "Members can view conversations" on public.conversations
  for select using (public.is_member(business_id));

drop policy if exists "Members can insert conversations" on public.conversations;

create policy "Members can insert conversations" on public.conversations
  for insert with check (public.is_member(business_id));

drop policy if exists "Members can update conversations" on public.conversations;

create policy "Members can update conversations" on public.conversations
  for update using (public.is_member(business_id));
