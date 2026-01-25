-- Create customer memory table for AI conversation persistence
CREATE TABLE public.customer_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  customer_identifier text NOT NULL, -- phone or handle
  channel text, -- whatsapp, instagram, etc
  customer_name text,
  vehicle_info jsonb DEFAULT '{}'::jsonb,
  preferred_benefit text,
  usage_pattern text,
  conversation_count integer DEFAULT 1,
  last_state text,
  last_interaction_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, customer_identifier)
);

-- Create indexes for fast lookups
CREATE INDEX idx_customer_memory_business ON public.customer_memory(business_id);
CREATE INDEX idx_customer_memory_identifier ON public.customer_memory(customer_identifier);
CREATE INDEX idx_customer_memory_last_interaction ON public.customer_memory(last_interaction_at DESC);

-- Enable RLS
ALTER TABLE public.customer_memory ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members select customer memory" 
ON public.customer_memory FOR SELECT 
USING (is_member(business_id));

CREATE POLICY "Members insert customer memory" 
ON public.customer_memory FOR INSERT 
WITH CHECK (is_member(business_id));

CREATE POLICY "Members update customer memory" 
ON public.customer_memory FOR UPDATE 
USING (is_member(business_id));