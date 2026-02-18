-- Add flyer_url column to services table for per-service flyer images
ALTER TABLE public.services ADD COLUMN flyer_url text DEFAULT NULL;