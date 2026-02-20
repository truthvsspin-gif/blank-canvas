
-- Add plan tier and usage limit columns to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS monthly_conversation_limit integer NOT NULL DEFAULT 50;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS monthly_ai_reply_limit integer NOT NULL DEFAULT 100;
