-- Performance Indexes - Run this entire file in Supabase SQL Editor
-- All statements use IF NOT EXISTS, so safe to run multiple times

-- PODCASTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_podcasts_slug 
ON podcasts(slug) 
WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_podcasts_author_public 
ON podcasts(author) 
WHERE is_private = false AND author IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_podcasts_private 
ON podcasts(is_private) 
WHERE is_private = false;

CREATE INDEX IF NOT EXISTS idx_podcasts_author_private 
ON podcasts(author, is_private) 
WHERE is_private = false AND author IS NOT NULL;

-- EPISODES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_episodes_podcast_id 
ON episodes(podcast_id);

CREATE INDEX IF NOT EXISTS idx_episodes_pub_date_desc 
ON episodes(pub_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_episodes_podcast_date 
ON episodes(podcast_id, pub_date DESC NULLS LAST);

-- AUTHORS TABLE INDEXES (if authors table exists)
CREATE INDEX IF NOT EXISTS idx_authors_name 
ON authors(name) 
WHERE name IS NOT NULL;

