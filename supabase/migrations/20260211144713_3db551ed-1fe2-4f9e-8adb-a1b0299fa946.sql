
-- Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_title text,
  phone text,
  email text,
  has_access boolean NOT NULL DEFAULT false,
  color text DEFAULT '#3b82f6',
  commission_pct numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view team" ON public.team_members FOR SELECT USING (is_member(business_id));
CREATE POLICY "Members can insert team" ON public.team_members FOR INSERT WITH CHECK (is_member(business_id));
CREATE POLICY "Members can update team" ON public.team_members FOR UPDATE USING (is_member(business_id));
CREATE POLICY "Members can delete team" ON public.team_members FOR DELETE USING (is_member(business_id));

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
