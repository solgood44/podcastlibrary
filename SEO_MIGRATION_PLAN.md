# SEO Migration Plan - Safe Incremental Approach

## Strategy: Start with Podcast Pages Only

**Why this makes sense:**
- ~1,300 podcast pages (manageable)
- 150K+ episode pages (too many to prerender, do selectively later)
- Lower risk - podcast pages are less complex
- Better ROI - podcast pages get more direct traffic
- Can add episode pages incrementally later

## Phase 1: Podcast Pages Only (Recommended Start)

### What We'll Build:
- `/podcast/[slug]` - Individual podcast pages
- Keep existing SPA working via rewrites
- Use Next.js ISR (Incremental Static Regeneration)
- Generate ~1,300 pages at build time, revalidate on-demand

### URL Structure:
- `podcastlibrary.org/podcast/the-daily-show` ✅
- `podcastlibrary.org/podcast/how-i-built-this` ✅
- Keep existing routes: `podcastlibrary.org` (SPA) ✅

### Implementation Approach:
1. **Add Next.js alongside existing SPA** (doesn't break anything)
2. **Use rewrites** - old routes still work
3. **ISR with revalidation** - pages regenerate when podcasts update
4. **Proper meta tags** - title, description, Open Graph, Twitter Cards

### Risk Level: 🟢 LOW
- Existing site keeps working
- New pages are additive
- Can rollback easily

---

## Phase 2: Episode Pages (Future - Selective)

### When to Add:
- After podcast pages are stable
- Only for popular/recent episodes initially
- Use dynamic SSR for rest (not prerendered)

### Strategy:
- Prerender: Latest 50 episodes per podcast (~65K pages max)
- Dynamic SSR: Older episodes (on-demand, cached)
- Or: Only prerender top 1000 most popular episodes

### URL Structure:
- `podcastlibrary.org/podcast/the-daily-show/episode/episode-123`
- `podcastlibrary.org/episode/[id]` (redirects to full path)

---

## Implementation Details

### Step 1: Add Slug Support
- Create `slug` field in podcasts table (or generate on-the-fly)
- Handle collisions (add numbers: `podcast-name`, `podcast-name-2`)

### Step 2: Next.js Setup
- Install Next.js in project root
- Create `pages/podcast/[slug].js`
- Configure `next.config.js` for rewrites

### Step 3: ISR Configuration
```javascript
// pages/podcast/[slug].js
export async function getStaticPaths() {
  // Fetch all podcast slugs
  // Return: { paths: [...], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  // Fetch podcast data
  return {
    props: { podcast },
    revalidate: 3600 // Revalidate every hour
  }
}
```

### Step 4: Rewrites (Keep SPA Working)
```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      // Existing SPA routes
      { source: '/', destination: '/index.html' },
      { source: '/:path*', destination: '/index.html' },
      // But exclude podcast pages
      { source: '/podcast/:slug', destination: '/podcast/[slug]' }
    ]
  }
}
```

---

## Build Time Estimate

**Podcast Pages Only (~1,300 pages):**
- Build time: ~5-10 minutes
- Storage: ~50-100MB
- Revalidation: On-demand when podcasts update

**All Episode Pages (~150K pages):**
- Build time: ~2-4 hours (not recommended)
- Storage: ~5-10GB
- Better: Use dynamic SSR for most episodes

---

## Recommendation

✅ **Start with Phase 1 (Podcast Pages)**
- Low risk
- High value
- Manageable scale
- Can test and iterate

⏸️ **Defer Phase 2 (Episode Pages)**
- Add later when podcast pages are proven
- Use selective prerendering (popular/recent only)
- Or dynamic SSR for most episodes

---

## Migration Steps (Safe)

1. Create feature branch
2. Add Next.js alongside existing code
3. Create one podcast page route
4. Test it works
5. Add ISR for all podcasts
6. Add rewrites to keep SPA working
7. Test thoroughly
8. Deploy to production
9. Monitor performance

---

## Questions to Consider

1. **Do you want to keep the SPA as-is?** (Recommended: Yes)
2. **Should we add slugs to database or generate on-the-fly?** (On-the-fly is simpler)
3. **How often do podcasts update?** (Affects revalidation strategy)

