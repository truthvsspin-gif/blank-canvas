-- Inbox threads/messages for chatbot conversations
create table if not exists public.inbox_threads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  channel text not null,
  conversation_id text not null,
  contact_name text,
  contact_handle text,
  status text not null default 'open',
  unread_count integer not null default 0,
  last_message_text text,
  last_intent text,
  last_message_direction text,
  last_message_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, channel, conversation_id)
);

comment on table public.inbox_threads is 'Conversation threads for chatbot inbox.';

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  thread_id uuid not null references public.inbox_threads(id) on delete cascade,
  channel text not null,
  conversation_id text not null,
  direction text not null,
  sender_name text,
  sender_handle text,
  message_text text not null,
  message_timestamp timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

comment on table public.inbox_messages is 'Messages stored for inbox threads.';

create index if not exists idx_inbox_threads_business on public.inbox_threads (business_id, updated_at desc);
create index if not exists idx_inbox_threads_lookup on public.inbox_threads (business_id, channel, conversation_id);
create index if not exists idx_inbox_messages_thread on public.inbox_messages (thread_id, message_timestamp desc);
create index if not exists idx_inbox_messages_business on public.inbox_messages (business_id, message_timestamp desc);

alter table public.inbox_threads enable row level security;
drop policy if exists "Members select inbox threads" on public.inbox_threads;
create policy "Members select inbox threads" on public.inbox_threads
  for select using (public.is_member(business_id));
drop policy if exists "Members insert inbox threads" on public.inbox_threads;
create policy "Members insert inbox threads" on public.inbox_threads
  for insert with check (public.is_member(business_id));
drop policy if exists "Members update inbox threads" on public.inbox_threads;
create policy "Members update inbox threads" on public.inbox_threads
  for update using (public.is_member(business_id));
drop policy if exists "Members delete inbox threads" on public.inbox_threads;
create policy "Members delete inbox threads" on public.inbox_threads
  for delete using (public.is_member(business_id));

alter table public.inbox_messages enable row level security;
drop policy if exists "Members select inbox messages" on public.inbox_messages;
create policy "Members select inbox messages" on public.inbox_messages
  for select using (public.is_member(business_id));
drop policy if exists "Members insert inbox messages" on public.inbox_messages;
create policy "Members insert inbox messages" on public.inbox_messages
  for insert with check (public.is_member(business_id));
drop policy if exists "Members update inbox messages" on public.inbox_messages;
create policy "Members update inbox messages" on public.inbox_messages
  for update using (public.is_member(business_id));
drop policy if exists "Members delete inbox messages" on public.inbox_messages;
create policy "Members delete inbox messages" on public.inbox_messages
  for delete using (public.is_member(business_id));
