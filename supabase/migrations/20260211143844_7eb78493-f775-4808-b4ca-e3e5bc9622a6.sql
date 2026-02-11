
-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view suppliers" ON public.suppliers FOR SELECT USING (is_member(business_id));
CREATE POLICY "Members can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (is_member(business_id));
CREATE POLICY "Members can update suppliers" ON public.suppliers FOR UPDATE USING (is_member(business_id));
CREATE POLICY "Members can delete suppliers" ON public.suppliers FOR DELETE USING (is_member(business_id));
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock purchases table
CREATE TABLE public.stock_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  item_name text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_date date,
  price numeric DEFAULT 0,
  qty numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view purchases" ON public.stock_purchases FOR SELECT USING (is_member(business_id));
CREATE POLICY "Members can insert purchases" ON public.stock_purchases FOR INSERT WITH CHECK (is_member(business_id));
CREATE POLICY "Members can update purchases" ON public.stock_purchases FOR UPDATE USING (is_member(business_id));
CREATE POLICY "Members can delete purchases" ON public.stock_purchases FOR DELETE USING (is_member(business_id));
CREATE TRIGGER update_stock_purchases_updated_at BEFORE UPDATE ON public.stock_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fixed costs table
CREATE TABLE public.stock_fixed_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  name text NOT NULL,
  start_date date,
  end_date date,
  recurrence text DEFAULT 'monthly',
  total numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  description text,
  beneficiary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view fixed costs" ON public.stock_fixed_costs FOR SELECT USING (is_member(business_id));
CREATE POLICY "Members can insert fixed costs" ON public.stock_fixed_costs FOR INSERT WITH CHECK (is_member(business_id));
CREATE POLICY "Members can update fixed costs" ON public.stock_fixed_costs FOR UPDATE USING (is_member(business_id));
CREATE POLICY "Members can delete fixed costs" ON public.stock_fixed_costs FOR DELETE USING (is_member(business_id));
CREATE TRIGGER update_stock_fixed_costs_updated_at BEFORE UPDATE ON public.stock_fixed_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
