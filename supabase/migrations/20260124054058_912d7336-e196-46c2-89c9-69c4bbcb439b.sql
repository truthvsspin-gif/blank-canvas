-- Add columns to conversations table for API performance tracking
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS response_time_ms integer;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_fallback boolean DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS ai_model text;

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_conversations_response_time ON public.conversations (response_time_ms);
CREATE INDEX IF NOT EXISTS idx_conversations_is_fallback ON public.conversations (is_fallback);
CREATE INDEX IF NOT EXISTS idx_conversations_ai_model ON public.conversations (ai_model);