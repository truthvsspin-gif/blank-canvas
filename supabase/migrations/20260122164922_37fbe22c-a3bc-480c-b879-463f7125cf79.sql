-- Media assets table for storing flyers/images per business
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'services_flyer',
  title TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media_assets IS 'Pre-uploaded flyers and images for chatbot media responses';

CREATE INDEX IF NOT EXISTS idx_media_assets_business ON public.media_assets (business_id, asset_type, is_active);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members select media assets" ON public.media_assets
  FOR SELECT USING (public.is_member(business_id));

CREATE POLICY "Members insert media assets" ON public.media_assets
  FOR INSERT WITH CHECK (public.is_member(business_id));

CREATE POLICY "Members update media assets" ON public.media_assets
  FOR UPDATE USING (public.is_member(business_id));

CREATE POLICY "Members delete media assets" ON public.media_assets
  FOR DELETE USING (public.is_member(business_id));

-- Add columns to messages table for media support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_asset_id UUID REFERENCES public.media_assets(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add columns to inbox_messages table for media support
ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS media_asset_id UUID REFERENCES public.media_assets(id);
ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add flyer cooldown setting to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS flyer_cooldown_hours INTEGER DEFAULT 24;

-- Create storage bucket for flyers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('flyers', 'flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for flyers bucket
CREATE POLICY "Members can upload flyers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'flyers' AND 
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.businesses WHERE public.is_member(id)
    )
  );

CREATE POLICY "Members can view their flyers" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'flyers' AND 
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.businesses WHERE public.is_member(id)
    )
  );

CREATE POLICY "Public can view flyers" ON storage.objects
  FOR SELECT USING (bucket_id = 'flyers');

CREATE POLICY "Members can delete their flyers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'flyers' AND 
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.businesses WHERE public.is_member(id)
    )
  );

-- Track last flyer sent per conversation to prevent spam
CREATE TABLE IF NOT EXISTS public.flyer_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  media_asset_id UUID REFERENCES public.media_assets(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flyer_send_log_lookup ON public.flyer_send_log (business_id, conversation_id, sent_at DESC);

ALTER TABLE public.flyer_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members select flyer log" ON public.flyer_send_log
  FOR SELECT USING (public.is_member(business_id));

CREATE POLICY "Members insert flyer log" ON public.flyer_send_log
  FOR INSERT WITH CHECK (public.is_member(business_id));