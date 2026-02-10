-- Quick wins: CRM audit trail

create table if not exists public.crm_audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.crm_audit_logs is 'Immutable audit entries for important CRM actions.';

create index if not exists idx_crm_audit_business_created on public.crm_audit_logs (business_id, created_at desc);
create index if not exists idx_crm_audit_entity on public.crm_audit_logs (business_id, entity_type, entity_id, created_at desc);

alter table public.crm_audit_logs enable row level security;

drop policy if exists "Members select crm audit logs" on public.crm_audit_logs;
create policy "Members select crm audit logs" on public.crm_audit_logs
  for select using (public.is_member(business_id));

drop policy if exists "Members insert crm audit logs" on public.crm_audit_logs;
create policy "Members insert crm audit logs" on public.crm_audit_logs
  for insert with check (public.is_member(business_id));
