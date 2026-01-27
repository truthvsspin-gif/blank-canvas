-- Add recovery attempt tracking to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS recovery_attempt_count integer NOT NULL DEFAULT 0;

-- Add index for quick lookups on stalled conversations
CREATE INDEX IF NOT EXISTS idx_conversations_recovery ON public.conversations (business_id, recovery_attempt_count) 
WHERE recovery_attempt_count > 0;

COMMENT ON COLUMN public.conversations.recovery_attempt_count IS 'Tracks Intent Recovery Window attempts (0-2) per DetaPRO v1.2 spec';