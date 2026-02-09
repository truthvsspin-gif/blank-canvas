-- CRM MVP operational upgrades (non-breaking additions)

-- Bookings: richer operational workflow + chatbot linkage
alter table public.bookings add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.bookings add column if not exists assigned_to uuid references public.users(id) on delete set null;
alter table public.bookings add column if not exists work_order_no text;
alter table public.bookings add column if not exists confirmation_notes text;
alter table public.bookings add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_bookings_business_status on public.bookings (business_id, status, scheduled_at);
create index if not exists idx_bookings_business_source on public.bookings (business_id, source, scheduled_at);
create index if not exists idx_bookings_lead on public.bookings (lead_id);
create index if not exists idx_bookings_assigned_to on public.bookings (assigned_to);

-- Normalize legacy statuses to operational wording
update public.bookings
set status = 'requested'
where status in ('new', 'pending');

-- Vehicles: inspection-grade data for detailing operations
alter table public.vehicles add column if not exists condition_notes text;
alter table public.vehicles add column if not exists photo_urls text[] not null default '{}';

-- Staff lookup support (within same tenant)
drop policy if exists "Members can view their memberships" on public.memberships;
create policy "Members can view workspace memberships" on public.memberships
  for select using (public.is_member(business_id));

drop policy if exists "Users can view workspace users" on public.users;
create policy "Users can view workspace users" on public.users
  for select using (
    exists (
      select 1
      from public.memberships target
      where target.user_id = public.users.id
        and public.is_member(target.business_id)
    )
  );
