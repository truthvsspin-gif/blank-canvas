-- Add unique constraint on conversation_id for upsert support
-- First, delete any duplicates keeping the most recent one
WITH duplicates AS (
  SELECT id, conversation_id,
    ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY updated_at DESC) as rn
  FROM public.conversations
  WHERE conversation_id IS NOT NULL
)
DELETE FROM public.conversations 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add the unique constraint
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_conversation_id_unique UNIQUE (conversation_id);