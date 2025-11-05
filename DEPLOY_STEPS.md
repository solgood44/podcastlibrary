# Deployment Steps

## Pre-Deployment Checklist

✅ SEO pages tested locally
✅ SPA tested separately
✅ Rollback plan ready (see ROLLBACK_PLAN.md)
✅ Backup of old vercel.json created (vercel.json.backup)

## Step 1: Commit to Git

```bash
# Check what will be committed
git status

# Add all files
git add .

# Commit
git commit -m "Add SEO-optimized podcast pages with Next.js"

# Push to GitHub
git push
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel CLI (if already connected)

```bash
vercel --prod
```

### Option B: Via GitHub (Auto-deploy)

If Vercel is connected to your GitHub:
1. Push to GitHub (done above)
2. Vercel automatically deploys
3. Check Vercel dashboard for status

### Option C: Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Click "Deploy" or "Redeploy"

## Step 3: Verify Deployment

After deployment, test:

1. **SEO pages:**
   - `https://podcastlibrary.org/podcast/[any-slug]`
   - Should show podcast page

2. **SPA still works:**
   - `https://podcastlibrary.org/web/`
   - Should show your full SPA

3. **Integration:**
   - Click "Listen" on SEO page
   - Should open episode in SPA

4. **Sitemap:**
   - `https://podcastlibrary.org/sitemap.xml`
   - Should list all podcasts

## Step 4: Submit to Google

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `podcastlibrary.org`
3. Verify ownership
4. Submit sitemap: `https://podcastlibrary.org/sitemap.xml`

## If Something Breaks

**Easiest revert:** See `ROLLBACK_PLAN.md`
- Just change `vercel.json` back to old config
- Or use `vercel.json.backup` as reference

## Expected Build Time

- First build: ~5-10 minutes (builds ~1,300 podcast pages)
- Subsequent builds: ~3-5 minutes (incremental)

## Monitoring

Watch Vercel dashboard for:
- Build logs
- Build success/failure
- Deployment URL

