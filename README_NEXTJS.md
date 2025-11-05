# Next.js SEO Setup - Quick Start

## What This Does

✅ Adds SEO-optimized podcast pages at `/podcast/[slug]`
✅ Keeps your existing SPA working (all routes still work)
✅ Generates ~1,300 podcast pages for Google to index
✅ Includes sitemap, robots.txt, and structured data

## Installation

```bash
npm install
```

## Deploy

Just push to GitHub or run:
```bash
vercel --prod
```

Vercel will automatically:
1. Build Next.js pages
2. Serve your SPA from `/web/`
3. Serve podcast pages from `/podcast/[slug]`

## Testing

After deployment, visit:
- `podcastlibrary.org/podcast/[any-podcast-slug]` - Should show SEO page
- `podcastlibrary.org/` - Your existing SPA (works as before)

## How It Works

- **Build time**: Next.js generates HTML for all podcasts
- **Runtime**: Your SPA still works via Vercel rewrites
- **Revalidation**: Podcast pages update every hour automatically

## Performance

- Build: ~5-10 minutes for 1,300 pages
- Page load: Instant (static HTML)
- No impact on your SPA performance

## Files Added

- `package.json` - Next.js dependencies
- `next.config.js` - Next.js configuration
- `pages/` - Next.js pages (podcast pages, sitemap, robots.txt)
- `lib/supabase.js` - Server-side data fetching
- Updated `vercel.json` - Routing configuration

## Your SPA Still Works

All your existing routes work exactly as before:
- `/` → redirects to `/web/`
- `/web/*` → your SPA
- `/podcast/*` → new SEO pages

Nothing breaks! 🎉

