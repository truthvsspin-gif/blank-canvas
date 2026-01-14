-- Helper to check membership
create or replace function public.is_member(target_business uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.memberships m
    where m.business_id = target_business
      and m.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;
