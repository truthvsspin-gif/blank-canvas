-- Service size-based pricing table
CREATE TABLE public.service_size_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  size TEXT NOT NULL, -- 'small', 'medium', 'large', 'suv'
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, size)
);

-- Enable RLS
ALTER TABLE public.service_size_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view size prices"
  ON public.service_size_prices FOR SELECT
  USING (is_member(business_id));

CREATE POLICY "Members can insert size prices"
  ON public.service_size_prices FOR INSERT
  WITH CHECK (is_member(business_id));

CREATE POLICY "Members can update size prices"
  ON public.service_size_prices FOR UPDATE
  USING (is_member(business_id));

CREATE POLICY "Members can delete size prices"
  ON public.service_size_prices FOR DELETE
  USING (is_member(business_id));

-- Auto-update timestamp trigger
CREATE TRIGGER update_service_size_prices_updated_at
  BEFORE UPDATE ON public.service_size_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();