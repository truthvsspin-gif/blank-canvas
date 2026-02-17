
-- Add Google Calendar integration fields to business_integrations
ALTER TABLE public.business_integrations
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_connected boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_integrations.google_calendar_refresh_token IS 'OAuth2 refresh token for Google Calendar API access';
COMMENT ON COLUMN public.business_integrations.google_calendar_id IS 'Google Calendar ID to sync events with';
COMMENT ON COLUMN public.business_integrations.google_calendar_connected IS 'Whether Google Calendar is currently connected';
