-- Add is_trojan_horse flag to services table
-- Only one service per business should be marked as the Trojan Horse (entry-level recommendation)

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_trojan_horse boolean NOT NULL DEFAULT false;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.services.is_trojan_horse IS 'Marks the entry-level service recommended for general/vague inquiries. Only one per business should be true.';