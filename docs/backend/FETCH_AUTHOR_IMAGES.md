# Fetching Author Images from Wikipedia

This guide explains how to fetch copyright-free author images from Wikipedia/Wikimedia Commons and store them in the database.

## Overview

The system supports using actual author photos from Wikipedia/Wikimedia Commons, which are typically Creative Commons licensed and copyright-free. Images are automatically formatted to a uniform 400x400 square size.

## Setup

### 1. Add Database Column

First, run the SQL migration to add the `image_url` column to the authors table:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f backend/add_author_image_column.sql
```

Or manually execute:
```sql
ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_authors_image_url ON public.authors (image_url) WHERE image_url IS NOT NULL;
```

### 2. Install Dependencies

The script requires Python packages. Install them:

```bash
cd backend
pip install httpx supabase python-dotenv rich
```

### 3. Configure Environment

Make sure your `.env` file has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### Fetch Images for All Authors

```bash
python3 backend/fetch_author_images.py
```

### Fetch Images with Limits

```bash
# Process only first 10 authors (for testing)
python3 backend/fetch_author_images.py --limit 10
```

### Fetch Image for Specific Author

```bash
python3 backend/fetch_author_images.py --author "J.K. Rowling"
```

### Dry Run (Test Without Updating Database)

```bash
python3 backend/fetch_author_images.py --dry-run
```

## How It Works

1. **Searches Wikipedia**: Uses Wikipedia REST API to find author pages
2. **Extracts Images**: Looks for portrait/photo images on the author's Wikipedia page
3. **Formats Images**: Converts images to uniform 400x400 square format using Wikimedia Commons thumbnail API
4. **Stores URLs**: Saves the formatted image URL in the `authors.image_url` column

## Image Format

All images are automatically formatted to:
- **Size**: 400x400 pixels (square)
- **Source**: Wikimedia Commons (copyright-free)
- **Format**: Uses Wikimedia Commons thumbnail API for uniform sizing

## Fallback Behavior

If no Wikipedia image is found for an author:
- The system falls back to the generated SVG graphics (colored circle with first letter)
- This ensures all authors have an image, even if Wikipedia doesn't have one

## API Endpoint

The frontend uses `/api/author-image?name={authorName}` which:
1. Checks the database for a stored image URL
2. Returns the stored URL if found
3. Falls back to generated image if not found

## Notes

- **Rate Limiting**: The script includes a 0.5 second delay between requests to be respectful to Wikipedia's API
- **Image Quality**: Wikipedia images are typically high quality and suitable for web use
- **Copyright**: All images from Wikimedia Commons are copyright-free (Creative Commons or Public Domain)
- **Caching**: Image URLs are cached in the database, so you only need to run the script once per author

## Troubleshooting

### No Images Found

- Some authors may not have Wikipedia pages
- Some authors may not have images on their Wikipedia pages
- The script will skip these and use the generated fallback

### Images Not Loading

- Check that the `image_url` column was added to the database
- Verify the URLs are valid by checking them in a browser
- Some external image URLs may have CORS restrictions (the redirect endpoint handles this)

### Script Errors

- Make sure your `.env` file has correct Supabase credentials
- Check that you have internet connectivity (script needs to access Wikipedia)
- Verify Python dependencies are installed

