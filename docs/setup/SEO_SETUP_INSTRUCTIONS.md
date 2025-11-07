# SEO Setup Instructions

## What Was Added

✅ **Next.js with ISR (Incremental Static Regeneration)**
- Podcast pages at `/podcast/[slug]`
- Builds ~1,300 pages at deploy time
- Revalidates every hour (new podcasts appear within an hour)

✅ **SEO Optimizations**
- Proper meta tags (title, description, Open Graph, Twitter Cards)
- JSON-LD structured data (Schema.org PodcastSeries)
- Canonical URLs
- Dynamic sitemap.xml
- robots.txt

✅ **Your SPA Still Works**
- All existing routes at `/web/` still work
- Next.js routes don't interfere with your SPA

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Test Locally (Optional)

```bash
npm run dev
```

Visit `http://localhost:3000/podcast/[any-podcast-slug]` to test.

### 3. Deploy to Vercel

The `vercel.json` is already configured. Just deploy:

```bash
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

## How It Works

1. **Build Time**: Next.js generates HTML pages for all podcasts
2. **Runtime**: If a podcast page is requested that wasn't built yet, it generates on-demand
3. **Revalidation**: Pages regenerate every hour when podcasts are updated
4. **Performance**: All pages are static HTML (fast for Google)

## URL Structure

- `podcastlibrary.org/` → Your existing SPA
- `podcastlibrary.org/podcast/the-daily-show` → SEO-optimized podcast page
- `podcastlibrary.org/web/` → Your existing SPA (all routes work)

## SEO Features

✅ **Meta Tags**: Every podcast page has unique title, description
✅ **Open Graph**: Facebook/Twitter sharing works
✅ **Structured Data**: Google understands it's a podcast
✅ **Sitemap**: `podcastlibrary.org/sitemap.xml` lists all podcasts
✅ **Canonical URLs**: Prevents duplicate content issues

## Performance

- **Build Time**: ~5-10 minutes for 1,300 pages
- **Page Load**: Instant (static HTML)
- **Revalidation**: Every hour (ISR)
- **Storage**: ~50-100MB

## Monitoring

After deployment, check:
1. Google Search Console: Submit sitemap (`/sitemap.xml`)
2. Test a podcast page: `podcastlibrary.org/podcast/[slug]`
3. Verify meta tags: Use browser dev tools or [opengraph.xyz](https://www.opengraph.xyz/)

## Troubleshooting

**Issue**: Pages not generating
- Check Supabase connection in `lib/supabase.js`
- Verify environment variables if using different Supabase project

**Issue**: SPA routes broken
- Check `next.config.js` rewrites
- Verify `/web/` routes still work

**Issue**: Build too slow
- Consider reducing initial build (use `fallback: 'blocking'` - already done)
- New podcasts generate on-demand

## Next Steps (Future)

When ready to add episode pages:
1. Create `/podcast/[slug]/episode/[id].js`
2. Use selective prerendering (only popular/recent episodes)
3. Use dynamic SSR for older episodes

