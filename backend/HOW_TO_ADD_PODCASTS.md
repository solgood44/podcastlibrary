# How to Add Podcasts

## Quick Steps

### 1. Create your `feeds.csv` file

In the `backend` folder, create a file called `feeds.csv` (or use the example as a template).

**Format:**
```csv
SOURCE RSS FEED,genre
https://feeds.example.com/podcast1.rss,Technology
https://feeds.example.com/podcast2.rss,Comedy
```

**Notes:**
- First line is the header (column names)
- `SOURCE RSS FEED` column contains the RSS feed URLs
- `genre` column is **optional** (will extract from RSS if not provided)
- One podcast per line

### 2. Find RSS Feed URLs

You need the RSS feed URL for each podcast. Common formats:
- `https://example.com/feed.xml`
- `https://example.com/podcast.rss`
- `https://feeds.example.com/podcast/feed.xml`

**How to find them:**
- Look for "RSS" or "Subscribe" links on podcast websites
- Podcast hosting platforms usually provide RSS feeds
- Some podcasts have them in their HTML: `<link rel="alternate" type="application/rss+xml" href="...">`

### 3. Add URLs to `feeds.csv`

Open `backend/feeds.csv` and add your podcast feed URLs:

```csv
SOURCE RSS FEED,genre
https://feeds.example.com/podcast1.rss,Technology
https://feeds.example.com/podcast2.rss,Comedy
https://feeds.example.com/podcast3.rss,
```

**Tip:** You can leave genre empty and it will be extracted from the RSS feed.

### 4. Run the Python Ingestor

From terminal in the `backend` folder:

```bash
cd backend
python feed_ingestor.py
```

The script will:
- Read all feed URLs from `feeds.csv`
- Fetch each RSS feed
- Parse podcast metadata (title, author, description, genre, image)
- Extract all episodes
- Upload everything to Supabase

### 5. Verify in Supabase

1. Go to Supabase Dashboard → Table Editor
2. Check the `podcasts` table - you should see your new podcasts
3. Check the `episodes` table - you should see all episodes

---

## Example: Adding a Single Podcast

**Step 1:** Add one line to `feeds.csv`:
```csv
SOURCE RSS FEED
https://feeds.npr.org/510289/podcast.xml
```

**Step 2:** Run the ingestor:
```bash
python feed_ingestor.py
```

**Done!** The podcast and all its episodes are now in your database.

---

## Adding More Podcasts Later

Just add more lines to `feeds.csv` and run `feed_ingestor.py` again. It will:
- Add new podcasts if the feed URL is new
- Update existing podcasts if the feed URL already exists (upsert)
- Only add new episodes (won't duplicate existing ones)

---

## Troubleshooting

**"FileNotFoundError: feeds.csv"**
- Make sure `feeds.csv` exists in the `backend` folder
- Or create it from `feeds.csv.example`:
  ```bash
  cp feeds.csv.example feeds.csv
  ```

**"Error processing feed: ..."**
- Check that the RSS feed URL is valid and accessible
- Try opening the URL in a browser to verify it works
- Some feeds may require authentication (not supported yet)

**Podcasts not showing up?**
- Check Supabase Table Editor to see if data was actually added
- Check terminal output for error messages
- Verify your `.env` file has correct Supabase credentials

---

## CSV File Location

The ingestor looks for `feeds.csv` in the `backend` folder by default. You can change this in `.env`:

```
CSV_PATH=./feeds.csv
```

