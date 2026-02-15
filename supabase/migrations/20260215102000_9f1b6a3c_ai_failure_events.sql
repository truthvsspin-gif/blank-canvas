CREATE TABLE IF NOT EXISTS public.ai_failure_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_failure_events_business_created
  ON public.ai_failure_events (business_id, created_at DESC);

ALTER TABLE public.ai_failure_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view AI failures"
  ON public.ai_failure_events
  FOR SELECT
  USING (public.is_member(business_id));

CREATE POLICY "Service role can insert AI failures"
  ON public.ai_failure_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Members can update AI failures"
  ON public.ai_failure_events
  FOR UPDATE
  USING (public.is_member(business_id));
