-- Add state machine columns to conversations table for consultative sales chatbot
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS current_state text DEFAULT 'STATE_0_OPENING',
  ADD COLUMN IF NOT EXISTS vehicle_info jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS benefit_intent text,
  ADD COLUMN IF NOT EXISTS usage_context text,
  ADD COLUMN IF NOT EXISTS recommendation_summary text,
  ADD COLUMN IF NOT EXISTS handoff_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_qualified boolean DEFAULT false;

-- Add index for state lookups
CREATE INDEX IF NOT EXISTS idx_conversations_current_state ON public.conversations (current_state);
CREATE INDEX IF NOT EXISTS idx_conversations_handoff ON public.conversations (handoff_required) WHERE handoff_required = true;

-- Add comments for documentation
COMMENT ON COLUMN public.conversations.current_state IS 'Sales state machine state: STATE_0_OPENING, STATE_1_VEHICLE, STATE_2_BENEFIT, STATE_3_USAGE, STATE_4_PRESCRIPTION, STATE_5_ACTION, STATE_6_HANDOFF';
COMMENT ON COLUMN public.conversations.vehicle_info IS 'JSON: {brand, model, type, size_class}';
COMMENT ON COLUMN public.conversations.benefit_intent IS 'Customer benefit intent: shine, protection, interior, unsure';
COMMENT ON COLUMN public.conversations.usage_context IS 'Vehicle usage: daily, occasional';
COMMENT ON COLUMN public.conversations.recommendation_summary IS 'Final AI recommendation text';
COMMENT ON COLUMN public.conversations.handoff_required IS 'Flag for human takeover';
COMMENT ON COLUMN public.conversations.lead_qualified IS 'Flag when lead is qualified';