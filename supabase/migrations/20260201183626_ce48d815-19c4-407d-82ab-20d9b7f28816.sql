-- Add scheduling fields to conversations table for chatbot scheduling flow
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS scheduled_day text,
ADD COLUMN IF NOT EXISTS scheduled_time text;