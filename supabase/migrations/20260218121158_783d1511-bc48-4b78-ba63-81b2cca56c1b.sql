-- Remove duplicate services (keep the earliest created_at for each name+business_id)
DELETE FROM public.service_size_prices WHERE service_id IN ('8223eed7-0b23-4f74-9428-da55edb0c08f', '9c3b7ab2-0680-4c0b-b0a2-8d9b4b416a61');
DELETE FROM public.services WHERE id IN ('8223eed7-0b23-4f74-9428-da55edb0c08f', '9c3b7ab2-0680-4c0b-b0a2-8d9b4b416a61');