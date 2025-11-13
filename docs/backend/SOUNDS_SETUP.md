# Sounds Feature Setup Guide

This guide explains how to set up the nature sounds feature on your podcast website.

## Overview

The sounds feature allows users to:
- Browse nature sounds in a grid layout
- Play sounds with seamless looping (no audible gaps)
- Sort sounds by title or category
- Access sounds from the sidebar menu

## Setup Steps

### 1. Create Database Schema

Run the SQL schema to create the `sounds` table:

```bash
# In Supabase SQL Editor or via psql
psql -h your-db-host -U postgres -d postgres -f backend/sounds_schema.sql
```

Or copy the contents of `backend/sounds_schema.sql` into the Supabase SQL Editor and run it.

### 2. Create Supabase Storage Bucket

1. Go to your Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Name: `sounds`
4. **Make it Public** (so sounds can be accessed without authentication)
5. Click **Create bucket**

### 3. Install Python Dependencies

The upload script requires `mutagen` for reading MP3 metadata:

```bash
cd backend
pip install -r requirements.txt
```

This will install `mutagen==1.47.0` along with other dependencies.

### 4. Configure Environment

Make sure your `.env` file has:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Upload Sounds

Run the upload script to upload MP3 files and populate the database:

```bash
python3 backend/upload_sounds.py
```

The script will:
- Scan the folder for MP3 files (default: `/Users/solomon/Library/CloudStorage/Dropbox-SolGoodMedia/Podcast Production/Sound Library/Archived Sounds/Infinite Nature I - Seamless Nature Loops/Sound Files/MP3`)
- Extract metadata (title, duration)
- Upload files to Supabase Storage
- Insert records into the `sounds` table
- Auto-categorize sounds (water, rain, wind, birds, etc.)

#### Options

```bash
# Use a different folder
python3 backend/upload_sounds.py --folder /path/to/sounds

# Dry run (test without uploading)
python3 backend/upload_sounds.py --dry-run

# Skip sounds that already exist
python3 backend/upload_sounds.py --skip-existing
```

### 6. Verify Setup

1. Visit your website and click "Sounds" in the sidebar menu
2. You should see all uploaded sounds in a grid layout
3. Click any sound to play it - it should loop seamlessly

## How It Works

### Seamless Looping

The sounds use HTML5 audio with the `loop` attribute enabled. For truly seamless looping:
- The audio element has `loop = true`
- An `ended` event listener restarts playback immediately if needed
- MP3 files should be designed to loop seamlessly (which yours are)

### Database Structure

The `sounds` table stores:
- `id`: UUID primary key
- `title`: Sound name
- `description`: Optional description
- `audio_url`: URL to the MP3 file in Supabase Storage
- `image_url`: Optional image URL
- `duration_seconds`: Duration in seconds
- `category`: Auto-categorized (water, rain, wind, birds, insects, forest, night, snow, nature)
- `is_premium`: Boolean flag for future payment integration

### Frontend

- Sounds are displayed in a grid similar to podcasts
- Each sound card shows:
  - Image (or placeholder)
  - Title
  - Category badge
  - Duration
  - Play/pause overlay on hover
- Clicking a sound plays it with seamless looping
- Sounds and episodes use separate audio players (so they don't interfere)

## Future: Premium Sounds

The database schema includes an `is_premium` flag. To implement premium sounds:

1. Add a `user_subscriptions` table to track user subscriptions
2. Update the RLS policy in `sounds_schema.sql` (commented out section)
3. Add payment integration (Stripe, etc.)
4. Check subscription status before allowing playback of premium sounds

## Troubleshooting

### Sounds not appearing

1. Check that the `sounds` table exists and has data
2. Verify RLS policies allow public read access
3. Check browser console for API errors
4. Verify the storage bucket is public

### Sounds not playing

1. Check that audio URLs are accessible (try opening in browser)
2. Verify CORS settings on Supabase Storage
3. Check browser console for audio errors
4. Ensure MP3 files are valid

### Upload script errors

1. Verify Supabase credentials in `.env`
2. Check that the storage bucket exists and is public
3. Ensure MP3 files are readable
4. Check that `mutagen` is installed

## File Structure

```
backend/
  sounds_schema.sql          # Database schema
  upload_sounds.py            # Upload script
  requirements.txt            # Python dependencies (includes mutagen)

web/
  app.js                      # Frontend logic (sounds functions)
  api.js                      # API service (fetchSounds method)
  index.html                  # HTML (sounds page, sidebar menu)
  styles.css                  # CSS (sound card styles)

public/web/                   # Same structure for public deployment
```

