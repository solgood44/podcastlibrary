# iOS App Setup Guide

Follow these steps to get your podcast app running and connected to your Supabase backend.

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (podcastwebsite)
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

## Step 2: Configure the iOS App

1. Open `PodcastMVP/Services/APIService.swift`
2. Replace `YOUR-PROJECT` with your actual Supabase project ID:
   ```swift
   private let baseURL = URL(string: "https://YOUR-PROJECT-ID.supabase.co/rest/v1/")!
   ```
   For example, if your URL is `https://abcdefghijklmnop.supabase.co`, your project ID is `abcdefghijklmnop`
   
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key:
   ```swift
   private let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // your actual key
   ```

## Step 3: Create Xcode Project (If Not Already Created)

If you don't have an Xcode project yet:

1. Open **Xcode**
2. File → New → Project
3. Choose **iOS** → **App**
4. Configure:
   - Product Name: `PodcastMVP`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - ✅ Use Core Data (unchecked)
   - ✅ Include Tests (optional)
5. Click **Next** and choose a location to save

## Step 4: Add Files to Xcode Project

1. In Xcode, right-click on the `PodcastMVP` folder in the navigator
2. Select **Add Files to "PodcastMVP"...**
3. Navigate to the `ios/PodcastMVP/` folder in this project
4. Select all the files:
   - `PodcastMVPApp.swift`
   - Models folder (Podcast.swift, Episode.swift)
   - Services folder (APIService.swift, ImageLoader.swift)
   - Views folder (LibraryGridView.swift, PodcastDetailView.swift, EpisodeListView.swift)
5. Make sure **"Copy items if needed"** is checked
6. Click **Add**

## Step 5: Update App Entry Point

If Xcode created a default `App.swift` or `ContentView.swift`, you can delete them. Your `PodcastMVPApp.swift` is the main entry point.

1. In Xcode, click on your project in the navigator
2. Select the **PodcastMVP** target
3. Go to the **Info** tab
4. Set **Main Interface** to empty (or delete the default ContentView.swift)

## Step 6: Build and Run

1. Select a simulator (e.g., iPhone 15 Pro) or connect a physical device
2. Press **⌘ + R** or click the **Play** button
3. The app should launch and show your 4 podcasts in a grid!

## Step 7: Test the App

- **View Podcasts**: You should see your 4 podcasts in a grid view
- **View Episodes**: Tap any podcast to see its episodes
- **Play Episodes**: Tap any episode to start playing
- **Player Controls**: Use the bottom player bar to play/pause

## Troubleshooting

### "Error loading podcasts"
- Double-check your Supabase URL and anon key in `APIService.swift`
- Make sure you ran `schema.sql` and `policies.sql` in Supabase
- Verify your backend has podcasts (check Supabase Table Editor)

### "The operation couldn't be completed"
- Check your internet connection
- Verify the Supabase URL format (should be `https://PROJECT-ID.supabase.co/rest/v1/`)
- Check Xcode console for detailed error messages

### App crashes on launch
- Make sure all Swift files are added to the Xcode project target
- Check that `PodcastMVPApp.swift` is set as the main entry point
- Clean build folder: Product → Clean Build Folder (⇧⌘K)

### Episodes not loading
- Verify episodes exist in Supabase for that podcast
- Check that `audio_url` is not null in the episodes table
- Some episodes might not have audio URLs - that's normal

## Next Steps

Once everything is working:
1. ✅ Browse your 4 podcasts
2. ✅ Listen to episodes
3. Add more podcasts by updating `backend/feeds.csv` and running `feed_ingestor.py`
4. Customize the UI if desired
5. Add features like:
   - Pull to refresh (already added!)
   - Playback speed controls
   - Sleep timer
   - Offline downloads

## Notes

- The app uses **read-only** access (anon key) - perfect for an MVP
- All audio streams directly from the original podcast host
- No audio files are stored in Supabase
- The player supports background playback on iOS

