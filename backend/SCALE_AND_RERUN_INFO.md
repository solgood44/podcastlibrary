# Scale & Re-run Information

## ✅ Backend is Set Up Correctly for Scale

Your schema is properly configured for **100K+ episodes** and **1000s of podcasts**:

### Current Indexes (Good for Performance):
- ✅ `idx_episodes_podcast_pub` - Composite index on (podcast_id, pub_date desc) for fast episode queries
- ✅ `uniq_episode_guid_per_podcast` - Unique constraint prevents duplicates, also acts as index
- ✅ `podcasts.feed_url` - Unique constraint with implicit index

### Additional Indexes Added (in `add_genres_array_fixed.sql`):
- ✅ `idx_podcasts_genres` - GIN index for array searches on genres
- ✅ `idx_podcasts_last_refreshed` - For finding podcasts that need refreshing
- ✅ `idx_episodes_pub_date` - Additional index on pub_date for faster date queries
- ✅ `idx_episodes_guid` - Faster duplicate checks

## 🔄 Running Ingestor Multiple Times - NO Duplicates!

**Safe to run multiple times!** The ingestor is designed to:

1. **Skip unchanged feeds** using ETag/Last-Modified headers (HTTP 304)
   - If feed hasn't changed, entire processing is skipped
   
2. **Upsert podcasts** - Updates existing or creates new based on `feed_url`
   - Won't create duplicate podcasts

3. **Skip duplicate episodes** - Checks before inserting:
   ```python
   # Checks if episode exists by (podcast_id, guid)
   exists = sb.table("episodes").select("id").eq("podcast_id", podcast_id).eq("guid", guid).execute().data
   if exists:
       return  # Skip - already exists
   ```

**Result:** Running `python3 feed_ingestor.py` again will:
- ✅ Only fetch feeds that have changed (via HTTP conditional requests)
- ✅ Only insert NEW episodes (existing ones are skipped)
- ✅ Update podcast metadata if changed (title, description, etc.)
- ❌ Will NOT create duplicate episodes or podcasts

## 🎵 Multiple Genres Support

### Before (Old Behavior):
- Only extracted **first genre** from RSS feed
- Stored as single `text` field

### After (New Behavior):
- Extracts **ALL genres** from RSS feed
- Includes nested categories (e.g., "Technology" → "Podcasting")
- Stores as `text[]` array in database
- Supports comma-separated genres in CSV override

### RSS Feed Genre Extraction:
Handles multiple formats:
```xml
<!-- Multiple top-level categories -->
<itunes:category text="Technology"/>
<itunes:category text="Business"/>

<!-- Nested categories -->
<itunes:category text="Technology">
  <itunes:category text="Podcasting"/>
</itunes:category>
```

All genres will be extracted and stored!

## 📋 Migration Steps

1. **Run the genre array migration** in Supabase SQL Editor:
   ```sql
   -- File: backend/add_genres_array_fixed.sql
   ```
   This converts `genre` from `text` to `text[]` and adds performance indexes.

2. **Re-run the ingestor** to update existing podcasts with all genres:
   ```bash
   cd backend
   python3 feed_ingestor.py
   ```
   This will:
   - Re-fetch all feeds
   - Extract ALL genres from each feed
   - Update existing podcasts with the full genre list
   - Add any new episodes that appeared since last run
   - Skip existing episodes (no duplicates!)

## 🔍 Querying Genres

After migration, query podcasts by genre:

```sql
-- Find all Technology podcasts
SELECT * FROM podcasts WHERE 'Technology' = ANY(genre);

-- Find podcasts with multiple genres
SELECT * FROM podcasts WHERE array_length(genre, 1) > 1;

-- Find podcasts containing "Technology" OR "Business"
SELECT * FROM podcasts WHERE genre && ARRAY['Technology', 'Business'];
```

