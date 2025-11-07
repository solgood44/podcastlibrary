# Testing in Dev Mode

## Quick Setup

**No backend server needed!** Your SPA connects directly to Supabase.

## Two Ways to Test

### Option 1: Test Everything Together (Recommended)

1. **Start Next.js dev server** (for SEO pages):
   ```bash
   npm run dev
   ```
   Runs on: `http://localhost:3000`

2. **Start simple HTTP server** (for SPA):
   ```bash
   cd web
   python3 -m http.server 8000
   ```
   Or use any static file server on port 8000

3. **Test:**
   - SEO pages: `http://localhost:3000/podcast/[slug]`
   - "Listen" buttons will open SPA at `http://localhost:8000`
   - SPA works: `http://localhost:8000`

### Option 2: Test Separately

1. **Test SEO pages only:**
   ```bash
   npm run dev
   ```
   Visit: `http://localhost:3000/podcast/[slug]`
   - Links won't work (that's ok for testing SEO pages)

2. **Test SPA separately:**
   ```bash
   cd web
   python3 -m http.server 8000
   ```
   Visit: `http://localhost:8000`
   - Full SPA experience
   - Test episode opening with: `http://localhost:8000/?episode=[id]&podcast=[id]`

## Production (Vercel)

In production, everything works automatically:
- SEO pages: `podcastlibrary.org/podcast/[slug]`
- SPA: `podcastlibrary.org/web/`
- Links work perfectly

## What to Test

✅ SEO pages load correctly
✅ SPA loads and works
✅ "Listen" buttons open episodes
✅ Episode detail page appears
✅ Audio player works

## Quick Test Command

```bash
# Terminal 1: Next.js (SEO pages)
npm run dev

# Terminal 2: SPA server  
cd web && python3 -m http.server 8000
```

Then visit:
- `http://localhost:3000/podcast/memoirs-of-napoleon-bonaparte`
- Click "Listen" → should open `http://localhost:8000` with episode

