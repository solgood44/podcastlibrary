# Podcast Player MVP — Supabase + Python Ingestor + SwiftUI App

This starter pack gives you a clean, lightweight foundation for building a podcast player:

- **No login (MVP)** — local-only library on device
- **Your feeds only** — ingested from CSV
- **No audio storage** — stream from original host; optional on-device downloads later
- **Compact Overcast-style grid** for podcasts
- **Vertical list** for episodes (recommended for readability)

## Project Structure

```
project/
  backend/
    schema.sql          # Supabase database schema
    policies.sql        # Row-level security policies
    feed_ingestor.py    # Python RSS feed ingestor
    requirements.txt    # Python dependencies
    feeds.csv.example   # Example CSV template
  ios/
    PodcastMVP/
      PodcastMVPApp.swift      # Main app entry point
      Models/
        Podcast.swift          # Podcast model
        Episode.swift          # Episode model
      Services/
        APIService.swift       # Supabase API client
        ImageLoader.swift      # Remote image loader
      Views/
        LibraryGridView.swift  # Main grid view
        PodcastDetailView.swift # Podcast detail wrapper
        EpisodeListView.swift   # Episode list with player
```

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

## Troubleshooting

**Python ingestor errors:**
- Make sure `.env` file has correct Supabase credentials
- Check that `feeds.csv` exists and has valid RSS URLs
- Verify network connectivity

**iOS app not loading podcasts:**
- Verify Supabase URL and anon key in `APIService.swift`
- Check that policies.sql was run (RLS should allow anonymous reads)
- Ensure backend ingestor has populated some data

**Audio not playing:**
- Check that episodes have valid `audio_url` values
- Verify network permissions in Info.plist if needed
- Some feeds may require special headers (extend `AVPlayer` initialization)

## License

This is a starter template. Use freely for your projects.

