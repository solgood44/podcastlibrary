-- Add image_url column to authors table
-- This will store URLs to copyright-free author images (e.g., from Wikimedia Commons)

ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_authors_image_url ON public.authors (image_url) WHERE image_url IS NOT NULL;

