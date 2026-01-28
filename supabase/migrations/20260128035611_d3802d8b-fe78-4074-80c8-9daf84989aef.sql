-- Add webhook verify token column to business_integrations
ALTER TABLE public.business_integrations 
ADD COLUMN IF NOT EXISTS webhook_verify_token text;

COMMENT ON COLUMN public.business_integrations.webhook_verify_token IS 'Token used to verify webhook requests from Meta (WhatsApp/Instagram)';