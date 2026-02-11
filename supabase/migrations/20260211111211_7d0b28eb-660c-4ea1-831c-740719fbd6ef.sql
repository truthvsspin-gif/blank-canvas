
-- Create the missing function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Stock items table for inventory management
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reference TEXT,
  available_qty NUMERIC NOT NULL DEFAULT 0,
  min_qty NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  expiry_date DATE,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stock" ON public.stock_items
  FOR SELECT USING (public.is_member(business_id));
CREATE POLICY "Members can insert stock" ON public.stock_items
  FOR INSERT WITH CHECK (public.is_member(business_id));
CREATE POLICY "Members can update stock" ON public.stock_items
  FOR UPDATE USING (public.is_member(business_id));
CREATE POLICY "Members can delete stock" ON public.stock_items
  FOR DELETE USING (public.is_member(business_id));

CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table for invoices/estimates
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'estimate',
  doc_number TEXT,
  order_id UUID REFERENCES public.work_orders(id),
  customer_id UUID REFERENCES public.customers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  taxes NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view documents" ON public.documents
  FOR SELECT USING (public.is_member(business_id));
CREATE POLICY "Members can insert documents" ON public.documents
  FOR INSERT WITH CHECK (public.is_member(business_id));
CREATE POLICY "Members can update documents" ON public.documents
  FOR UPDATE USING (public.is_member(business_id));
CREATE POLICY "Members can delete documents" ON public.documents
  FOR DELETE USING (public.is_member(business_id));

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
