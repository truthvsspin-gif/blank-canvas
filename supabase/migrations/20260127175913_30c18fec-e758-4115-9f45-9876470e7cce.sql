-- Follow-up queue table to track scheduled re-engagement messages
CREATE TABLE IF NOT EXISTS public.follow_up_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  follow_up_type text NOT NULL CHECK (follow_up_type IN ('24h', '48h', '5d', '7d')),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  message_sent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  UNIQUE(conversation_id, follow_up_type)
);

COMMENT ON TABLE public.follow_up_queue IS 'Scheduled follow-up messages for cold leads per DetaPRO v1.2 spec.';

-- Index for efficient querying of pending follow-ups
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_pending ON public.follow_up_queue (status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_business ON public.follow_up_queue (business_id);

-- Enable RLS
ALTER TABLE public.follow_up_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view follow-ups" ON public.follow_up_queue
  FOR SELECT USING (public.is_member(business_id));

CREATE POLICY "Members can insert follow-ups" ON public.follow_up_queue
  FOR INSERT WITH CHECK (public.is_member(business_id));

CREATE POLICY "Members can update follow-ups" ON public.follow_up_queue
  FOR UPDATE USING (public.is_member(business_id));

-- Service role needs access for the cron job
CREATE POLICY "Service role full access" ON public.follow_up_queue
  FOR ALL USING (auth.role() = 'service_role');