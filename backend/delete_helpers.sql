-- Helper SQL queries for deleting data from Supabase
-- Run these in Supabase SQL Editor

-- Delete a specific podcast by feed_url (episodes cascade automatically)
DELETE FROM public.podcasts WHERE feed_url = 'https://example.com/feed.rss';

-- Delete a specific podcast by title
DELETE FROM public.podcasts WHERE title ILIKE '%search term%';

-- Delete a specific podcast by ID
DELETE FROM public.podcasts WHERE id = 'uuid-here';

-- Delete all podcasts (clears entire database - USE WITH CAUTION!)
-- DELETE FROM public.podcasts;

-- Delete specific episodes (without deleting the podcast)
DELETE FROM public.episodes WHERE podcast_id = 'podcast-uuid-here';

-- Delete old episodes (e.g., older than 1 year)
DELETE FROM public.episodes 
WHERE pub_date < NOW() - INTERVAL '1 year';

-- Delete episodes from a specific podcast by feed_url
DELETE FROM public.episodes 
WHERE podcast_id IN (
    SELECT id FROM public.podcasts WHERE feed_url = 'https://example.com/feed.rss'
);

-- View what you're about to delete (check first!)
SELECT id, title, feed_url FROM public.podcasts WHERE feed_url = 'https://example.com/feed.rss';
SELECT COUNT(*) FROM public.episodes WHERE podcast_id IN (
    SELECT id FROM public.podcasts WHERE feed_url = 'https://example.com/feed.rss'
);

