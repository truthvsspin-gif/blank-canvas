-- Optional business id override used by webhook routing/debugging.
ALTER TABLE public.business_integrations
ADD COLUMN IF NOT EXISTS webhook_business_id text;

COMMENT ON COLUMN public.business_integrations.webhook_business_id
IS 'Optional business id override configured from Integrations UI for webhook routing.';
