-- Migration: Add slug column to podcasts table for efficient querying
-- This dramatically reduces egress by allowing direct slug-based queries
-- instead of fetching all podcasts and filtering client-side

-- Step 1: Add slug column
ALTER TABLE public.podcasts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_podcasts_slug ON public.podcasts(slug);

-- Step 3: Populate slug column for existing podcasts
-- This matches the generateSlug function logic in JavaScript
UPDATE public.podcasts 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        COALESCE(title, ''),
        '[^\w\s-]', '', 'g'
      ),
      '[\s_-]+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Step 3.5: Handle duplicate slugs by appending numbers
-- This ensures all slugs are unique before creating the unique index
DO $$
DECLARE
  podcast_record RECORD;
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER;
BEGIN
  -- Process podcasts in order by ID to ensure consistent numbering
  FOR podcast_record IN 
    SELECT id, slug 
    FROM public.podcasts 
    WHERE slug IS NOT NULL AND slug != ''
    ORDER BY id
  LOOP
    base_slug := podcast_record.slug;
    new_slug := base_slug;
    counter := 1;
    
    -- Check if this slug already exists for a different podcast
    WHILE EXISTS (
      SELECT 1 
      FROM public.podcasts 
      WHERE slug = new_slug 
      AND id != podcast_record.id
    ) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    -- Update the slug if it was changed
    IF new_slug != base_slug THEN
      UPDATE public.podcasts 
      SET slug = new_slug 
      WHERE id = podcast_record.id;
    END IF;
  END LOOP;
END $$;

-- Step 4: Add unique constraint to prevent duplicate slugs
-- This should now succeed since all duplicates have been handled
CREATE UNIQUE INDEX IF NOT EXISTS uniq_podcasts_slug ON public.podcasts(slug)
WHERE slug IS NOT NULL AND slug != '';

-- Step 5: Add NOT NULL constraint after population
-- Uncomment this after verifying all slugs are populated:
-- ALTER TABLE public.podcasts ALTER COLUMN slug SET NOT NULL;

