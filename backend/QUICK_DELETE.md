# Quick Guide: Deleting a Podcast

## Method 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project: **podcastwebsite**
3. Click **Table Editor** in the left sidebar
4. Click on **podcasts** table
5. Find the podcast you want to delete
6. Click the checkbox on the left of the row (or click anywhere on the row)
7. Click the **Delete** button (or trash icon) at the top
8. Confirm deletion

**Done!** All episodes are automatically deleted.

---

## Method 2: SQL Editor (Quick if you know the feed URL)

1. Go to https://supabase.com/dashboard
2. Select your project: **podcastwebsite**
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Paste this SQL (replace the URL with the one you want to delete):

```sql
DELETE FROM public.podcasts 
WHERE feed_url = 'https://example.com/podcast.rss';
```

6. Click **Run** (or press Cmd+Enter)
7. You'll see "Success. X row(s) deleted"

**Done!** Episodes cascade automatically.

---

## Method 3: Find it first, then delete

If you don't know the exact feed URL:

1. In **SQL Editor**, run this to see all podcasts:

```sql
SELECT id, title, feed_url FROM public.podcasts 
ORDER BY title;
```

2. Copy the `feed_url` of the one you want to delete
3. Then run:

```sql
DELETE FROM public.podcasts 
WHERE feed_url = 'PASTE_THE_URL_HERE';
```

---

## Method 4: Python Script

From terminal in the `backend` folder:

```bash
# See all podcasts first
python delete_podcast.py --list

# Delete by feed URL
python delete_podcast.py --feed-url "https://example.com/podcast.rss"

# Delete by title (searches for partial match)
python delete_podcast.py --title "Podcast Name"
```

---

**Important:** Deleting a podcast automatically deletes ALL its episodes (cascade delete). This cannot be undone unless you have backups.

