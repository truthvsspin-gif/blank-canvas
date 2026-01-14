-- Knowledge base sources + chunks (RAG)
create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'text', 'document')),
  source_uri text,
  title text,
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  content_tsv tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now()
);

alter table public.knowledge_chunks add column if not exists embedding jsonb;

comment on table public.knowledge_sources is 'Knowledge base sources per business.';

comment on table public.knowledge_chunks is 'Chunked knowledge content for retrieval.';

create index if not exists idx_knowledge_sources_business on public.knowledge_sources (business_id);

create index if not exists idx_knowledge_chunks_source on public.knowledge_chunks (source_id);

create index if not exists idx_knowledge_chunks_business on public.knowledge_chunks (business_id);

create index if not exists idx_knowledge_chunks_tsv on public.knowledge_chunks using gin (content_tsv);

alter table public.knowledge_sources enable row level security;

drop policy if exists "Members manage knowledge sources" on public.knowledge_sources;

create policy "Members manage knowledge sources" on public.knowledge_sources
  for all using (public.is_member(business_id)) with check (public.is_member(business_id));

alter table public.knowledge_chunks enable row level security;

drop policy if exists "Members view knowledge chunks" on public.knowledge_chunks;

create policy "Members view knowledge chunks" on public.knowledge_chunks
  for select using (public.is_member(business_id));
