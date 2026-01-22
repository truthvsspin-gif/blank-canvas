-- Add industry and AI customization columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS industry_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS ai_instructions text;

COMMENT ON COLUMN public.businesses.industry_type IS 'Business industry category for AI context';
COMMENT ON COLUMN public.businesses.business_description IS 'Description of business used in AI prompts';
COMMENT ON COLUMN public.businesses.ai_instructions IS 'Custom AI behavior instructions';