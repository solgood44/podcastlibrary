-- Performance Indexes for Podcast Website
-- Run this in Supabase SQL Editor to improve query performance
-- These indexes will reduce database load and improve response times

-- ============================================
-- PODCASTS TABLE INDEXES
-- ============================================

-- Index for slug-based podcast queries (if slug column exists)
-- This is critical for fast podcast lookups by slug
CREATE INDEX IF NOT EXISTS idx_podcasts_slug 
ON podcasts(slug) 
WHERE slug IS NOT NULL;

-- Index for author queries (filtered by private status)
-- Improves performance of fetchPodcastsByAuthor and author-related queries
CREATE INDEX IF NOT EXISTS idx_podcasts_author_public 
ON podcasts(author) 
WHERE is_private = false AND author IS NOT NULL;

-- Index for genre queries (if genre is stored as JSONB array)
-- Note: This uses GIN index for JSONB array containment queries
-- Only create if genre column is JSONB type
-- CREATE INDEX IF NOT EXISTS idx_podcasts_genre_gin 
-- ON podcasts USING gin(genre) 
-- WHERE is_private = false;

-- Index for private status filtering (composite with other queries)
-- Helps with queries that filter by is_private
CREATE INDEX IF NOT EXISTS idx_podcasts_private 
ON podcasts(is_private) 
WHERE is_private = false;

-- Composite index for common query patterns (author + private)
CREATE INDEX IF NOT EXISTS idx_podcasts_author_private 
ON podcasts(author, is_private) 
WHERE is_private = false AND author IS NOT NULL;

-- ============================================
-- EPISODES TABLE INDEXES
-- ============================================

-- Index for podcast_id lookups (most common episode query)
-- Critical for fetchEpisodesByPodcastId
CREATE INDEX IF NOT EXISTS idx_episodes_podcast_id 
ON episodes(podcast_id);

-- Index for publication date sorting
-- Improves performance of episode queries ordered by pub_date
CREATE INDEX IF NOT EXISTS idx_episodes_pub_date_desc 
ON episodes(pub_date DESC NULLS LAST);

-- Composite index for podcast + date queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_episodes_podcast_date 
ON episodes(podcast_id, pub_date DESC NULLS LAST);

-- ============================================
-- AUTHORS TABLE INDEXES (if exists)
-- ============================================

-- Index for author name lookups
CREATE INDEX IF NOT EXISTS idx_authors_name 
ON authors(name) 
WHERE name IS NOT NULL;

-- ============================================
-- VERIFY INDEXES
-- ============================================

-- Run this query to see all indexes on podcasts table:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'podcasts';

-- Run this query to see all indexes on episodes table:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'episodes';

-- ============================================
-- NOTES
-- ============================================

-- 1. Indexes take up storage space, but significantly improve query performance
-- 2. Indexes are automatically maintained by PostgreSQL
-- 3. For large tables, index creation may take a few minutes
-- 4. Monitor index usage with: 
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
-- 5. If genre column is TEXT or VARCHAR (not JSONB), the GIN index won't work
--    In that case, consider a different indexing strategy or normalize genres

