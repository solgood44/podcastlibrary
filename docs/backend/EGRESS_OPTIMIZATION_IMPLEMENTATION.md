# Egress Optimization - Implementation Guide

## ✅ What's Been Done Automatically

All code changes have been implemented. Here's what's ready:

### 1. ✅ Slug Column Migration SQL
**File:** `backend/add_slug_column.sql`
- Ready to run in Supabase SQL Editor
- Adds slug column, index, and populates existing data

### 2. ✅ Feed Ingestor Updated
**File:** `backend/feed_ingestor.py`
- Now generates and stores slugs automatically
- All new/updated podcasts will have slugs

### 3. ✅ Optimized Database Queries
**File:** `lib/supabase.js`
- `fetchPodcastBySlug` now uses slug-based query (fetches 1 podcast instead of all)
- All queries use specific column selection (no more `select=*`)
- Episodes exclude `transcript` field (large, rarely needed)
- Added pagination support to `fetchEpisodesByPodcastId`

### 4. ✅ API Response Caching
**File:** `pages/api/author-image.js`
- Added cache headers (24h for stored images, 1h for generated)
- Reduces redundant API calls

### 5. ✅ Client-Side Caching
**Files:** `web/api.js`, `public/web/api.js`
- In-memory cache with TTL
- Cache durations:
  - Podcasts: 5 minutes
  - Episodes: 10 minutes
  - Authors: 30 minutes
  - Sounds: 15 minutes

### 6. ✅ Increased Revalidation Time
**Files:** `pages/podcast/[slug].js`, `pages/author/[slug].js`
- Changed from 1 hour to 6 hours
- Reduces database queries for static pages

### 7. ✅ Pagination Support
- Episode queries now support `limit` and `offset` parameters
- Reduces data transfer for podcasts with many episodes

## 🔧 What You Need to Do

### Step 1: Run Database Migration (REQUIRED)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `backend/add_slug_column.sql`
4. Copy the entire SQL script
5. Paste into SQL Editor
6. Click **Run**

**Important:** If you get an error about duplicate slugs, you'll need to handle duplicates manually:
```sql
-- Check for duplicate slugs
SELECT slug, COUNT(*) 
FROM podcasts 
WHERE slug IS NOT NULL 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- For duplicates, you can append podcast ID to make them unique
UPDATE podcasts p1
SET slug = slug || '-' || SUBSTRING(p1.id::text, 1, 8)
FROM podcasts p2
WHERE p1.slug = p2.slug 
  AND p1.id != p2.id
  AND p1.slug IS NOT NULL;
```

### Step 2: Verify Migration Worked

After running the migration, test that slugs are populated:
```sql
-- Check if slugs are populated
SELECT title, slug FROM podcasts LIMIT 10;

-- Check for any NULL slugs
SELECT COUNT(*) FROM podcasts WHERE slug IS NULL OR slug = '';
```

### Step 3: Deploy Code Changes

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Optimize egress: add slug column, caching, and query optimizations"
   ```

2. **Push to your repository:**
   ```bash
   git push origin main
   ```

3. **Deploy to Vercel** (if auto-deploy is enabled, this happens automatically)

### Step 4: Test the Changes

1. Visit a podcast page: `/podcast/[some-slug]`
2. Check browser console for `[Cache HIT]` or `[Cache MISS]` messages
3. Visit the same page again - should see `[Cache HIT]`
4. Check Supabase Dashboard → Usage to monitor egress

### Step 5: Run Feed Ingestor (Optional but Recommended)

To populate slugs for existing podcasts that might have been updated:
```bash
cd backend
python3 feed_ingestor.py
```

This will update all podcasts with slugs if they're missing.

## 📊 Expected Results

### Before Optimizations:
- **Egress:** ~33 GB/month
- **Cost:** ~$2.54/month overage
- **Podcast page visit:** Fetches ALL podcasts (~500KB+ per visit)

### After Optimizations:
- **Egress:** Should drop to <5 GB/month (within free tier)
- **Cost:** $0/month
- **Podcast page visit:** Fetches 1 podcast (~5-10KB per visit)
- **Cache hit rate:** 60-80% for returning users

### For 1,000-10,000 Users:
- **Daily active users:** 100-1,000 (10% of total)
- **Page views per user:** 5-10 pages
- **With caching:** 60-80% cache hits
- **Estimated egress:** 2-4 GB/month (well within free tier)

## 🎯 Monitoring & Alerts

### Set Up Usage Alerts in Supabase:

1. Go to **Settings** → **Usage**
2. Set up alerts at:
   - **3 GB** (60% of free tier) - Warning
   - **4.5 GB** (90% of free tier) - Critical

### Monitor These Metrics:

1. **Egress per day** - Should be <200 MB/day
2. **Cache hit rate** - Check browser console logs
3. **Query frequency** - Supabase Dashboard → Database → Logs

### Weekly Check:

Every Monday, check:
- Total egress for previous week
- Any spikes in usage
- Cache effectiveness (look for patterns)

## 🚨 Troubleshooting

### Issue: Slug column migration fails
**Solution:** Check for duplicate slugs first, then run migration

### Issue: Podcast pages not loading
**Solution:** The code has fallback to old method - check browser console for errors

### Issue: Egress still high after changes
**Check:**
1. Are images being served from Supabase Storage? (Check Storage bucket usage)
2. Are there any background jobs fetching data?
3. Check Supabase Dashboard → Logs for frequent queries

### Issue: Cache not working
**Solution:** 
- Check browser console for cache logs
- Verify `apiService.clearCache()` isn't being called too often
- Check cache TTL values are appropriate

## 📈 Scaling Beyond 10,000 Users

If you grow beyond 10,000 users, consider:

1. **Upgrade to Supabase Pro** ($25/month)
   - 50 GB egress included
   - Better performance
   - More database space

2. **Implement CDN for static assets**
   - Move images to Cloudflare/CDN
   - Reduce Supabase Storage egress

3. **Add Redis caching layer**
   - Cache frequently accessed data
   - Reduce database queries

4. **Database read replicas**
   - Distribute read load
   - Better performance at scale

## ✅ Checklist

- [ ] Run database migration (`add_slug_column.sql`)
- [ ] Verify slugs are populated
- [ ] Deploy code changes
- [ ] Test podcast pages load correctly
- [ ] Check browser console for cache logs
- [ ] Set up Supabase usage alerts
- [ ] Monitor egress for 3-7 days
- [ ] Run feed ingestor to update any missing slugs

## 📝 Notes

- All changes are backward compatible
- Fallback methods exist if slug column doesn't exist yet
- Cache is in-memory (cleared on page refresh) - consider localStorage for persistence
- Revalidation time can be adjusted based on how often content changes

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ Egress drops below 5 GB/month
2. ✅ Podcast pages load faster
3. ✅ Browser console shows cache hits
4. ✅ No more overage charges
5. ✅ Site performance improves

---

**Questions?** Check the main `EGRESS_OPTIMIZATION.md` file for detailed explanations of each optimization.

