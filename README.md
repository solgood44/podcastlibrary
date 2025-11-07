# Podcast Website — Full-Stack Podcast Platform

A complete podcast platform with web app, iOS app, and backend infrastructure:

- **Web App** — Next.js website with SEO-optimized podcast pages and SPA player
- **iOS App** — Native SwiftUI podcast player
- **Backend** — Python RSS feed ingestor with Supabase database
- **Analytics** — Google Analytics 4 integration
- **Deployment** — Ready for Vercel/Netlify deployment

## 📚 Documentation

**All documentation is organized in the [`docs/`](docs/) folder.** Start with:
- **[Documentation Index](docs/README.md)** — Complete guide to all docs
- **[Setup Guides](docs/setup/)** — Initial setup and configuration
- **[Deployment Guides](docs/deployment/)** — How to deploy your site

## 🚀 Quick Start

1. **Set up Supabase** (see Setup Instructions below)
2. **Configure backend** — Run the Python feed ingestor
3. **Deploy web app** — See [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
4. **Set up analytics** — See [GA4 Setup](docs/setup/GA4_SETUP.md)

## Project Structure

```
project/
  docs/                 # 📚 All documentation (organized by topic)
    setup/              # Setup and configuration guides
    deployment/         # Deployment guides
    testing/            # Testing guides
    backend/            # Backend-specific docs
    security/           # Security documentation
    reports/            # Audit reports
  backend/              # Backend scripts and database
    schema.sql          # Supabase database schema
    policies.sql        # Row-level security policies
    feed_ingestor.py    # Python RSS feed ingestor
    requirements.txt    # Python dependencies
    feeds.csv           # RSS feed list
  pages/                # Next.js pages (SEO-optimized)
  web/                  # Web SPA (main podcast player)
  lib/                  # Shared utilities (analytics, Supabase)
  ios/                  # iOS SwiftUI app
    PodcastMVP/
      Models/           # Data models
      Services/         # API services
      Views/            # UI views
```

**For detailed documentation, see [docs/README.md](docs/README.md)**

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run `backend/schema.sql` first to create the tables
4. Run `backend/policies.sql` to set up row-level security policies
5. Note your project URL and anon key (Settings → API)

### 2. Backend Setup (Python Feed Ingestor)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file (copy from `.env.example`):
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CSV_PATH=./feeds.csv
   REFRESH_BATCH_SIZE=200
   ```

4. Create `feeds.csv` with your podcast RSS feeds:
   ```csv
   SOURCE RSS FEED
   https://feeds.example.com/podcast1.rss
   https://feeds.example.com/podcast2.rss
   ```

5. Run the ingestor:
   ```bash
   python feed_ingestor.py
   ```

   The ingestor will:
   - Parse RSS feeds from your CSV
   - Use ETag/Last-Modified headers to avoid re-downloading unchanged feeds
   - Insert/update podcasts and only new episodes
   - Respect rate limits with a 0.1s delay between feeds

6. **Schedule regular runs** (optional):
   - Deploy to Railway/Vercel/Fly.io
   - Set up a cron job to run every 6-12 hours

### 3. iOS App Setup

1. Open Xcode and create a new iOS project:
   - Choose "App" template
   - Product Name: `PodcastMVP`
   - Interface: SwiftUI
   - Language: Swift

2. Copy all files from `ios/PodcastMVP/` into your Xcode project:
   - Models: `Podcast.swift`, `Episode.swift`
   - Services: `APIService.swift`, `ImageLoader.swift`
   - Views: `LibraryGridView.swift`, `PodcastDetailView.swift`, `EpisodeListView.swift`
   - App: `PodcastMVPApp.swift`

3. Configure `APIService.swift`:
   - Replace `YOUR-PROJECT` with your Supabase project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

4. Build and run the app!

## Features

### Backend
- ✅ RSS feed parsing with `feedparser`
- ✅ Conditional requests (ETag/Last-Modified) for efficiency
- ✅ Automatic podcast metadata extraction
- ✅ Episode deduplication via GUID
- ✅ Duration parsing (handles `hh:mm:ss` and `mm:ss` formats)
- ✅ Batch processing with configurable size

### iOS App
- ✅ Compact grid layout (Overcast-style)
- ✅ Vertical episode list
- ✅ Basic audio player with AVPlayer
- ✅ Remote image loading with AsyncImage
- ✅ Navigation between library → podcast → episodes
- ✅ Simple player bar with play/pause controls

## Next Steps / Optional Enhancements

- [ ] Add pull-to-refresh on Library and Episode lists
- [ ] Add sleep timer + playback speed controls in PlayerBar
- [ ] Add drag-to-reorder (store order locally with `@AppStorage` or CoreData)
- [ ] Implement offline downloads using `URLSessionDownloadTask`
- [ ] Add episode descriptions/transcripts view
- [ ] Improve player UI with progress bar and seek controls

## Monetization (Future)

When ready to add paid features:
1. Add StoreKit products (monthly/yearly subscriptions)
2. Verify receipts server-side (Supabase Edge Function)
3. Create a `user_entitlements` table
4. Update RLS policies to gate premium feeds
5. RSS parsing remains unchanged; only gate API endpoints

## 📖 More Documentation

- **[Setup Guides](docs/setup/)** — Google Analytics, SEO, DNS, Authentication
- **[Deployment Guides](docs/deployment/)** — Vercel, Netlify, rollback plans
- **[Testing Guides](docs/testing/)** — Pre-deployment testing
- **[Backend Guides](docs/backend/)** — Adding podcasts, enhancing descriptions
- **[Security](docs/security/)** — Security assessment and best practices

## Troubleshooting

**Python ingestor errors:**
- Make sure `.env` file has correct Supabase credentials
- Check that `feeds.csv` exists and has valid RSS URLs
- Verify network connectivity
- See [Backend Guides](docs/backend/) for more help

**Web app issues:**
- Check [Testing Guide](docs/testing/TESTING_GUIDE.md)
- Review [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- See [Manual Steps](docs/other/MANUAL_STEPS.md)

**iOS app not loading podcasts:**
- Verify Supabase URL and anon key in `APIService.swift`
- Check that policies.sql was run (RLS should allow anonymous reads)
- Ensure backend ingestor has populated some data
- See `ios/GETTING_STARTED.md`

**Audio not playing:**
- Check that episodes have valid `audio_url` values
- Verify network permissions in Info.plist if needed
- Some feeds may require special headers (extend `AVPlayer` initialization)

## License

This is a starter template. Use freely for your projects.

