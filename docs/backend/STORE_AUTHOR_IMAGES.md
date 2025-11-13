# Storing Author Images in Supabase Storage

This guide explains how to download, process, and store author images from Wikipedia in Supabase Storage.

## Overview

The system:
1. Downloads copyright-free images from Wikipedia/Wikimedia Commons
2. Processes them: resizes to 400x400 and applies sepia filter
3. Stores processed images in Supabase Storage
4. Saves storage URLs in the database

**Copyright Note**: All images are from Wikimedia Commons, which are Creative Commons licensed or Public Domain. The sepia filter is applied for visual consistency, not to avoid copyright - these images are already copyright-free.

## Setup

### 1. Create Supabase Storage Bucket

1. Go to your Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Name: `author-images`
4. **Make it Public** (so images can be accessed without authentication)
5. Click **Create bucket**

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `Pillow` (for image processing)
- `numpy` (for sepia filter)
- Other required packages

### 3. Configure Environment

Make sure your `.env` file has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### Process All Authors

```bash
python3 backend/fetch_and_store_author_images.py
```

### Test with a Few Authors

```bash
# Process only first 10 authors
python3 backend/fetch_and_store_author_images.py --limit 10
```

### Process Specific Author

```bash
python3 backend/fetch_and_store_author_images.py --author "Albert Einstein"
```

### Dry Run (Test Without Uploading)

```bash
python3 backend/fetch_and_store_author_images.py --dry-run --limit 5
```

### Skip Authors That Already Have Images

```bash
# Only process authors without images
python3 backend/fetch_and_store_author_images.py --skip-existing
```

## How It Works

1. **Searches Wikipedia**: Uses Wikipedia REST API to find author pages
2. **Downloads Images**: Fetches images from Wikimedia Commons
3. **Processes Images**:
   - Resizes to 400x400 pixels (square, maintains aspect ratio with padding)
   - Applies sepia tone filter for visual consistency
   - Converts to JPEG format (85% quality)
4. **Uploads to Storage**: Saves processed images to Supabase Storage bucket
5. **Updates Database**: Stores the public storage URL in `authors.image_url`

## Image Processing

### Size
- All images are resized to **400x400 pixels**
- Aspect ratio is maintained (images are centered on white background)
- High-quality resampling (LANCZOS) for best results

### Sepia Filter
- Applied to all images for visual consistency
- Creates a warm, vintage look
- Slightly reduced saturation (90%) for subtlety
- Does NOT change copyright status - images are already copyright-free

## Storage Structure

Images are stored in Supabase Storage with filenames like:
- `albert_einstein.jpg`
- `stephen_king.jpg`
- `j_k_rowling.jpg`

The script automatically generates safe filenames from author names.

## Frontend Usage

The frontend automatically uses stored images when available. The `image_url` column in the `authors` table contains Supabase Storage URLs, which are:
- Fast (CDN-backed)
- Reliable (stored locally)
- Uniform (all processed the same way)

## Troubleshooting

### "Bucket not found" Error

Make sure you've created the `author-images` bucket in Supabase Storage and made it public.

### Images Not Loading

1. Check that the bucket is **public**
2. Verify the storage URL format in the database
3. Check Supabase Storage → `author-images` bucket to see if files were uploaded

### Processing Errors

- Some images may fail to download (network issues)
- Some images may fail to process (corrupted files)
- The script will continue processing other authors

### Rate Limiting

The script includes a 0.5 second delay between requests to be respectful to Wikipedia's API. For large author lists, this means the script will take time - be patient!

## Copyright Information

**Important**: All images are sourced from Wikimedia Commons, which contains:
- **Public Domain** images (no copyright)
- **Creative Commons** licensed images (free to use with attribution)

The sepia filter is applied for:
- Visual consistency across all author images
- Creating a cohesive design aesthetic
- NOT to avoid copyright (images are already copyright-free)

Since your site is non-monetized and using public domain/Creative Commons content, you're in good legal standing.

