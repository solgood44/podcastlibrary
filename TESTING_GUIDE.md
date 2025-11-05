# Testing Guide - Before Deploying

## Quick Test Checklist

### 1. Start the Dev Server
```bash
npm run dev
```
Wait for: "Ready on http://localhost:3000"

### 2. Test SEO Podcast Pages
Visit these URLs in your browser:

✅ **Test podcast page:**
- `http://localhost:3000/podcast/memoirs-of-napoleon-bonaparte`
- Or any podcast slug from `/test-podcasts`

**What to check:**
- [ ] Page loads (not 404)
- [ ] Dark theme matches your SPA
- [ ] Podcast title, image, description show
- [ ] Episodes list appears
- [ ] "Listen" buttons are visible

### 3. Test SPA Integration
✅ **Test "Listen" button:**
- Click "Listen on Podcast Library →" on an episode
- Should open your SPA at `/web/`
- Episode should automatically open

**What to check:**
- [ ] Redirects to `/web/` 
- [ ] Episode detail page opens automatically
- [ ] URL params are cleaned up (no `?episode=...` in URL)

### 4. Test SPA Still Works
✅ **Test your existing SPA:**
- Visit: `http://localhost:3000/web/`
- Or: `http://localhost:3000/` (redirects to web)

**What to check:**
- [ ] Home page loads
- [ ] Sidebar works
- [ ] Podcast grid/list shows
- [ ] Can navigate to episodes
- [ ] Audio player works
- [ ] Search works
- [ ] All existing features work

### 5. Test URL Parameters
✅ **Test direct episode links:**
- Visit: `http://localhost:3000/web/?episode=[episode-id]&podcast=[podcast-id]`
- Replace IDs with real ones from your database

**What to check:**
- [ ] Episode opens automatically
- [ ] Works even if SPA already loaded

### 6. Test Sitemap
✅ **Test sitemap generation:**
- Visit: `http://localhost:3000/sitemap.xml`

**What to check:**
- [ ] XML sitemap shows
- [ ] Lists all podcasts
- [ ] Has proper URLs

### 7. Test Robots.txt
✅ **Test robots.txt:**
- Visit: `http://localhost:3000/robots.txt`

**What to check:**
- [ ] Shows robots.txt content
- [ ] Points to sitemap

## Common Issues & Fixes

### Issue: 404 on podcast pages
**Fix:** Make sure Supabase credentials are correct in `lib/supabase.js`

### Issue: "Listen" button doesn't work
**Fix:** Check browser console for errors. Make sure SPA loaded first.

### Issue: SPA routes broken
**Fix:** Check `vercel.json` rewrites are correct

### Issue: Styles not loading
**Fix:** Make sure CSS is imported in `pages/_app.js`

## What to Test Before Git Push

✅ All the above tests pass
✅ No console errors
✅ No build errors (`npm run build` works)
✅ Both SEO pages AND SPA work

## Production Test (After Deploy)

After deploying to Vercel:
1. Test on production URL
2. Test SEO pages work
3. Test SPA integration
4. Submit sitemap to Google Search Console

## Get Real Episode/Podcast IDs for Testing

Visit: `http://localhost:3000/test-podcasts`
- Shows list of podcasts
- Shows their slugs
- Shows example episode IDs

