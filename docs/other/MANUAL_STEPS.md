# Manual Steps Required

## ✅ Steps You Must Do (Can't Be Automated)

### 1. Install Dependencies (One Time)
```bash
npm install
```
**Why:** I can't run npm commands on your machine - you need to install Next.js and React.

---

### 2. Deploy to Vercel

**Option A: Via Command Line**
```bash
vercel --prod
```
(You'll need to be logged in: `vercel login`)

**Option B: Via GitHub** (Recommended)
1. Commit and push your code:
   ```bash
   git add .
   git commit -m "Add SEO podcast pages"
   git push
   ```
2. Vercel will auto-deploy if already connected to GitHub

**Why:** I can't deploy to your Vercel account - you need to authenticate and deploy.

---

### 3. Verify Deployment Works

After deploying, test:
- ✅ Visit `podcastlibrary.org/podcast/[any-podcast-slug]` - Should show SEO page
- ✅ Visit `podcastlibrary.org/` - Your SPA should still work
- ✅ Check `podcastlibrary.org/sitemap.xml` - Should list all podcasts

**Why:** You need to verify everything works in production.

---

### 4. Submit Sitemap to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property: `podcastlibrary.org`
3. Verify ownership (via DNS or HTML file)
4. Go to **Sitemaps** section
5. Submit: `https://podcastlibrary.org/sitemap.xml`
6. Wait for Google to crawl (usually 1-7 days)

**Why:** Only you can access your Google Search Console account.

---

### 5. (Optional) Set Environment Variables

If you want to use different Supabase credentials or change them later:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

**Currently:** Hardcoded in `lib/supabase.js` (works fine, but env vars are better practice)

**Why:** Only you can access your Vercel account settings.

---

### 6. (Optional) Monitor SEO Performance

After a few weeks:
- Check Google Search Console for indexing status
- See which podcast pages are ranking
- Monitor search impressions/clicks

**Why:** SEO results take time - you'll need to check periodically.

---

## 🚨 Potential Issues to Watch For

### If Build Fails:
- Check Supabase connection (credentials in `lib/supabase.js`)
- Verify you have enough podcasts in database
- Check Vercel build logs for errors

### If SPA Routes Break:
- Check `vercel.json` rewrites are correct
- Verify `/web/` directory is being served
- May need to adjust rewrite rules

### If Podcast Pages Don't Generate:
- Check Supabase API is accessible
- Verify `fetchAllPodcasts()` returns data
- Check browser console for errors

---

## 📋 Quick Checklist

- [ ] Run `npm install`
- [ ] Deploy to Vercel (`vercel --prod` or push to GitHub)
- [ ] Test podcast page: `podcastlibrary.org/podcast/[slug]`
- [ ] Test SPA still works: `podcastlibrary.org/`
- [ ] Verify sitemap: `podcastlibrary.org/sitemap.xml`
- [ ] Submit sitemap to Google Search Console
- [ ] (Optional) Set environment variables in Vercel
- [ ] Wait 1-7 days for Google to start indexing

---

## 🎯 That's It!

Everything else is automated:
- ✅ Code is written
- ✅ Configuration is set up
- ✅ SEO meta tags are included
- ✅ Sitemap generates automatically
- ✅ Pages regenerate every hour

You just need to install, deploy, and submit to Google!

