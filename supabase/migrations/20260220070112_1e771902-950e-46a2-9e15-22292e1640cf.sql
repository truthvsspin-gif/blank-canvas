CREATE POLICY "Admins can view all businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all businesses"
ON public.businesses
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));