-- WhatsApp/Instagram messages for CRM inbox visibility
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id text not null,
  direction text not null,
  sender text,
  message_text text not null,
  timestamp timestamptz not null default now(),
  channel text not null
);

comment on table public.messages is 'Raw inbound/outbound messages for CRM inbox.';

create index if not exists idx_messages_business on public.messages (business_id, timestamp desc);
create index if not exists idx_messages_conversation on public.messages (business_id, conversation_id, timestamp desc);

alter table public.messages enable row level security;
drop policy if exists "Members select messages" on public.messages;
create policy "Members select messages" on public.messages
  for select using (public.is_member(business_id));
drop policy if exists "Members insert messages" on public.messages;
create policy "Members insert messages" on public.messages
  for insert with check (public.is_member(business_id));
drop policy if exists "Members update messages" on public.messages;
create policy "Members update messages" on public.messages
  for update using (public.is_member(business_id));
drop policy if exists "Members delete messages" on public.messages;
create policy "Members delete messages" on public.messages
  for delete using (public.is_member(business_id));
