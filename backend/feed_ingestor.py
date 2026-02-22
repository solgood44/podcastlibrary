import csv
import os
import sys
import time
import re
from datetime import datetime, timedelta, timezone
from dateutil import parser as dateparser
import feedparser
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv
import random
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn, TimeRemainingColumn
from rich.console import Console

load_dotenv()

def _require_env(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val:
        print(f"ERROR: Missing required environment variable: {name}", file=sys.stderr)
        print("  Set it in GitHub Actions secrets (Settings → Secrets and variables → Actions).", file=sys.stderr)
        sys.exit(1)
    return val

SUPABASE_URL = _require_env("SUPABASE_URL")
SUPABASE_KEY = _require_env("SUPABASE_SERVICE_ROLE_KEY")
CSV_PATH = os.environ.get("CSV_PATH", "./feeds.csv") or "./feeds.csv"
# BATCH_SIZE: If set to a positive integer, limits the number of feeds to process.
# Set REFRESH_BATCH_SIZE environment variable to limit (e.g., "200" for testing)
# If unset, 0, empty, or "all", processes all feeds
_batch_size_env = os.environ.get("REFRESH_BATCH_SIZE", "").strip().lower()
if _batch_size_env and _batch_size_env != "0" and _batch_size_env != "all":
    try:
        BATCH_SIZE = int(_batch_size_env)
        if BATCH_SIZE <= 0:
            BATCH_SIZE = None
    except ValueError:
        BATCH_SIZE = None
else:
    BATCH_SIZE = None
FORCE_REFRESH = os.environ.get("FORCE_REFRESH", "false").lower() == "true"
# DELETE_MISSING: If true, deletes podcasts from database that are not in the CSV
DELETE_MISSING = os.environ.get("DELETE_MISSING", "true").lower() == "true"
# ONLY_DAILY_FEEDS: If true, only process feeds that have a "daily" column set (1, true, yes, daily).
# Add a column "daily" to feeds.csv and set it for feeds you want to refresh when using this.
ONLY_DAILY_FEEDS = os.environ.get("ONLY_DAILY_FEEDS", "false").lower() == "true"
# When True, only refresh feeds that are "active" (had an episode in last N days) or new. Skips completed/inactive feeds.
REFRESH_ACTIVE_ONLY = os.environ.get("REFRESH_ACTIVE_ONLY", "true").lower() == "true"
# Feeds with no new episode in this many days are considered "complete" and skipped on normal runs.
ACTIVE_DAYS = int(os.environ.get("REFRESH_ACTIVE_DAYS", "60"))

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Helpers ---------------------------------------------------------------

def generate_slug(title: str) -> str:
    """
    Generate URL-friendly slug from title.
    Matches the JavaScript generateSlug function in lib/supabase.js
    """
    if not title:
        return ''
    
    # Convert to lowercase and trim
    slug = title.lower().strip()
    
    # Remove special characters
    slug = re.sub(r'[^\w\s-]', '', slug)
    
    # Replace spaces and underscores with hyphens
    slug = re.sub(r'[\s_-]+', '-', slug)
    
    # Remove leading/trailing hyphens
    slug = re.sub(r'^-+|-+$', '', slug)
    
    return slug

def retry_db_operation(func, max_retries=3, base_delay=1):
    """Retry a database operation with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return func()
        except (httpx.RemoteProtocolError, httpx.NetworkError, httpx.ConnectError) as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, 0.5)
            time.sleep(delay)
        except Exception:
            # For non-network errors, don't retry
            raise
    return None

def upsert_podcast(feed_url: str, meta: dict):
    # Generate slug from title for efficient querying
    title = meta.get("title")
    slug = generate_slug(title) if title else None
    
    data = {
        "feed_url": feed_url,
        "title": title,
        "author": meta.get("author"),
        "image_url": meta.get("image_url"),
        "description": meta.get("description"),
        "genre": meta.get("genre"),
        "slug": slug,  # Add slug for efficient querying
        "etag": meta.get("etag"),
        "last_modified": meta.get("last_modified"),
        "last_refreshed": datetime.utcnow().isoformat()
    }
    # Upsert by feed_url with retry
    def _upsert():
        res = sb.table("podcasts").upsert(data, on_conflict="feed_url").execute()
        return res.data[0]
    return retry_db_operation(_upsert)


def check_episode_exists(podcast_id: str, guid: str) -> bool:
    """Check if an episode with the given guid already exists for this podcast."""
    def _check_exists():
        return sb.table("episodes").select("id").eq("podcast_id", podcast_id).eq("guid", guid).execute().data
    
    exists = retry_db_operation(_check_exists)
    return bool(exists)


def insert_new_episode(podcast_id: str, item: dict) -> bool:
    """
    Insert a new episode if it doesn't exist.
    Returns True if inserted, False if it already existed or couldn't be inserted.
    """
    guid = item.get("id") or item.get("guid") or item.get("link")
    if not guid:
        return False

    # Check if exists with retry
    if check_episode_exists(podcast_id, guid):
        return False

    # Parse dates and duration
    pub_date = None
    if item.get("published"):
        try:
            pub_date = dateparser.parse(item["published"]).isoformat()
        except Exception:
            pass

    duration_seconds = None
    dur = item.get("itunes_duration") or item.get("duration")
    if dur:
        try:
            if isinstance(dur, str) and ":" in dur:
                # hh:mm:ss or mm:ss
                parts = [int(p) for p in dur.split(":")]
                if len(parts) == 3:
                    duration_seconds = parts[0]*3600 + parts[1]*60 + parts[2]
                elif len(parts) == 2:
                    duration_seconds = parts[0]*60 + parts[1]
            else:
                duration_seconds = int(dur)
        except Exception:
            pass

    audio_url = None
    enc = item.get("enclosures") or []
    if enc:
        audio_url = enc[0].get("href")

    ep = {
        "podcast_id": podcast_id,
        "guid": guid,
        "title": item.get("title"),
        "description": item.get("summary"),
        "audio_url": audio_url,
        "pub_date": pub_date,
        "duration_seconds": duration_seconds,
        "image_url": (item.get("image") or {}).get("href") if isinstance(item.get("image"), dict) else None,
    }
    # Insert with retry, catch unique constraint violations
    try:
        def _insert():
            sb.table("episodes").insert(ep).execute()
        retry_db_operation(_insert)
        return True
    except Exception as e:
        # Check if it's a unique constraint violation (PostgreSQL error code 23505)
        # Supabase may expose error code in different ways
        error_str = str(e)
        error_code = None
        
        # Try to get error code from exception attributes
        if hasattr(e, 'code'):
            error_code = str(e.code)
        elif hasattr(e, 'message') and isinstance(e.message, dict):
            error_code = str(e.message.get('code', ''))
        elif hasattr(e, 'args') and len(e.args) > 0 and isinstance(e.args[0], dict):
            error_code = str(e.args[0].get('code', ''))
        
        # Check for unique constraint violation
        if (error_code == '23505' or 
            '23505' in error_str or 
            'duplicate key' in error_str.lower() or 
            'unique constraint' in error_str.lower()):
            # Episode already exists - return False (no new insert)
            return False
        # Re-raise other exceptions
        raise


def fetch_and_process(feed_url: str, etag: str | None, last_modified: str | None, genre_override: str | None = None):
    headers = {}
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified

    # Use httpx to get raw RSS with conditional headers
    # Use HTTP/1.1 to avoid HTTP/2 connection issues, and enable redirect following
    with httpx.Client(timeout=20, http2=False, follow_redirects=True) as client:
        r = client.get(feed_url, headers=headers)
        if r.status_code == 304:
            return None, []  # unchanged
        r.raise_for_status()
        content = r.content
        etag_new = r.headers.get("ETag")
        lm_new = r.headers.get("Last-Modified")

    parsed = feedparser.parse(content)
    
    # Extract itunes:author directly from XML (feedparser doesn't always handle namespaced fields)
    # Try to extract from raw XML content
    itunes_author = None
    try:
        # Look for <itunes:author> or <itunes_author> tags
        itunes_author_match = re.search(
            rb'<itunes:author[^>]*>(.*?)</itunes:author>',
            content,
            re.IGNORECASE | re.DOTALL
        )
        if not itunes_author_match:
            # Try without namespace (some feeds use <itunes_author>)
            itunes_author_match = re.search(
                rb'<itunes_author[^>]*>(.*?)</itunes_author>',
                content,
                re.IGNORECASE | re.DOTALL
            )
        if itunes_author_match:
            itunes_author = itunes_author_match.group(1).decode('utf-8').strip()
    except Exception:
        # If extraction fails, continue without it
        pass

    # Extract ALL genres from iTunes category or categories
    genres = []
    
    def extract_genre_from_item(item):
        """Extract genre name from a category item (dict or string)"""
        if isinstance(item, dict):
            return item.get("term") or item.get("label") or item.get("text")
        elif isinstance(item, str):
            return item
        return None
    
    def extract_nested_genres(cat_item):
        """Recursively extract genres from nested category structures"""
        extracted = []
        if isinstance(cat_item, dict):
            # Top-level category
            top_genre = extract_genre_from_item(cat_item)
            if top_genre:
                extracted.append(top_genre)
            # Check for nested categories (subcategories)
            if "category" in cat_item:
                nested = cat_item["category"]
                if isinstance(nested, list):
                    for n in nested:
                        nested_genre = extract_genre_from_item(n)
                        if nested_genre:
                            extracted.append(nested_genre)
                else:
                    nested_genre = extract_genre_from_item(nested)
                    if nested_genre:
                        extracted.append(nested_genre)
        elif isinstance(cat_item, str):
            extracted.append(cat_item)
        return extracted
    
    itunes_cats = parsed.feed.get("itunes_category")
    if itunes_cats:
        if isinstance(itunes_cats, list):
            # Multiple categories - extract all of them
            for cat in itunes_cats:
                genres.extend(extract_nested_genres(cat))
        elif isinstance(itunes_cats, dict):
            # Single category - extract it and any nested ones
            genres.extend(extract_nested_genres(itunes_cats))
    
    # Also check tags field (common in RSS feeds, may have additional genres)
    tags = parsed.feed.get("tags")
    if tags:
        if isinstance(tags, list):
            for tag in tags:
                # Tags can be dicts with 'term', 'label', or just strings
                if isinstance(tag, dict):
                    tag_term = tag.get("term") or tag.get("label")
                    if tag_term:
                        genres.append(tag_term)
                elif isinstance(tag, str):
                    genres.append(tag)
        elif isinstance(tags, str):
            genres.append(tags)
    
    # Fallback to categories field if still not found
    if not genres:
        cats = parsed.feed.get("categories")
        if cats:
            if isinstance(cats, list):
                for cat in cats:
                    cat_str = cat if isinstance(cat, str) else str(cat)
                    if cat_str:
                        genres.append(cat_str)
            elif isinstance(cats, str):
                genres.append(cats)
    
    # Remove duplicates while preserving order
    seen = set()
    genres_unique = []
    for g in genres:
        if g and g.lower() not in seen:
            seen.add(g.lower())
            genres_unique.append(g)
    
    # Use CSV override if provided (can be comma-separated for multiple)
    if genre_override:
        override_genres = [g.strip() for g in genre_override.split(",") if g.strip()]
        genres_unique = override_genres
    
    # Convert to None if empty, or list if has values
    genre = genres_unique if genres_unique else None

    meta = {
        "title": parsed.feed.get("title"),
        # Prioritize itunes:author extracted from XML, then feedparser's itunes_author, then fallback to author
        "author": itunes_author or parsed.feed.get("itunes_author") or parsed.feed.get("author"),
        "image_url": (parsed.feed.get("image") or {}).get("href") if isinstance(parsed.feed.get("image"), dict) else parsed.feed.get("itunes_image"),
        "description": parsed.feed.get("subtitle") or parsed.feed.get("description"),
        "genre": genre,
        "etag": etag_new or etag,
        "last_modified": lm_new or last_modified,
    }
    items = parsed.entries or []
    return meta, items


# --- Main -----------------------------------------------------------------

def read_csv_feeds(path: str):
    """Read feeds from CSV, optionally with genre override and daily flag.
    Returns list of tuples: (feed_url, genre_override or None, is_daily: bool).
    is_daily is True when the row has a 'daily' column set to 1, true, yes, or daily.
    """
    feeds = []
    daily_candidates = ["daily", "Daily", "DAILY", "frequency", "Frequency"]
    daily_truthy = {"1", "true", "yes", "daily", "day"}
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        url_candidates = [
            "SOURCE RSS FEED", "feed_url", "url", "rss", "RSS",
        ]
        genre_candidates = [
            "genre", "Genre", "GENRE", "category", "Category", "CATEGORY"
        ]
        for row in reader:
            feed_url = None
            genre_override = None
            is_daily = False

            for c in url_candidates:
                if c in row and row[c]:
                    feed_url = row[c].strip()
                    break
            for c in genre_candidates:
                if c in row and row[c]:
                    genre_override = row[c].strip()
                    break
            for c in daily_candidates:
                if c in row and row[c]:
                    val = row[c].strip().lower()
                    if val in daily_truthy:
                        is_daily = True
                    break

            if feed_url:
                feeds.append((feed_url, genre_override, is_daily))
    return feeds


def get_existing_etags(feed_url: str):
    """Get existing etag, last_modified, podcast_id, and last_refreshed timestamp."""
    def _get_etags():
        return sb.table("podcasts").select("etag,last_modified,id,last_refreshed").eq("feed_url", feed_url).limit(1).execute().data
    row = retry_db_operation(_get_etags)
    if row:
        return (
            row[0].get("etag"),
            row[0].get("last_modified"),
            row[0].get("id"),
            row[0].get("last_refreshed")
        )
    return None, None, None, None


def has_new_episodes(podcast_id: str, items: list, force_check: bool = False) -> bool:
    """
    Check if any of the items are new episodes (not already in database).
    
    Args:
        podcast_id: The podcast ID
        items: List of episode items from the feed
        force_check: If True, always return True (force processing)
    """
    if not items or not podcast_id:
        return False
    
    if force_check:
        return True
    
    # Sample check: check first few items to see if any are new
    # If we find new ones, we'll process all. If not, we skip.
    sample_size = min(5, len(items))
    for item in items[:sample_size]:
        guid = item.get("id") or item.get("guid") or item.get("link")
        if guid and not check_episode_exists(podcast_id, guid):
            return True
    return False


def was_recently_refreshed(last_refreshed_str: str | None, threshold_minutes: int = 10) -> bool:
    """
    Check if a feed was recently refreshed (within threshold_minutes).
    This could indicate the process was interrupted mid-processing.
    """
    if not last_refreshed_str:
        return False
    
    try:
        last_refreshed = dateparser.parse(last_refreshed_str)
        now = datetime.utcnow()
        time_diff = (now - last_refreshed).total_seconds() / 60  # Convert to minutes
        return time_diff < threshold_minutes
    except Exception:
        return False


def get_active_feed_urls(csv_feed_urls: list[str]) -> set[str]:
    """
    Return set of feed_urls that should be refreshed this run:
    - New feeds (in CSV but not in DB)
    - Feeds where the latest episode pub_date is within ACTIVE_DAYS (still "active")
    Skips feeds that have no new episode in ACTIVE_DAYS (considered complete/inactive).
    Uses batched queries to avoid URL length limits.
    """
    if not csv_feed_urls:
        return set()
    csv_set = set(csv_feed_urls)
    cutoff = datetime.utcnow() - timedelta(days=ACTIVE_DAYS)

    # Batch size for IN clauses (avoid 414 URI too long)
    batch_size = 400

    def _get_podcasts_batch(urls_batch):
        return retry_db_operation(
            lambda: sb.table("podcasts").select("id, feed_url").in_("feed_url", urls_batch).execute().data
        )

    feed_to_id = {}
    for i in range(0, len(csv_feed_urls), feed_url_batch_size):
        batch = csv_feed_urls[i : i + feed_url_batch_size]
        rows = _get_podcasts_batch(batch) or []
        for row in rows:
            feed_to_id[row["feed_url"]] = row["id"]

    new_feeds = csv_set - set(feed_to_id.keys())
    podcast_ids = list(feed_to_id.values())
    if not podcast_ids:
        return new_feeds

    # Get max(pub_date) per podcast_id from episodes (PostgREST: group by non-aggregate column)
    id_to_latest = {}
    for j in range(0, len(podcast_ids), podcast_id_batch_size):
        id_batch = podcast_ids[j : j + podcast_id_batch_size]
        try:
            # Select podcast_id and max pub_date; filter by podcast_id in batch
            res = retry_db_operation(
                lambda b=id_batch: sb.table("episodes")
                .select("podcast_id, pub_date.max()")
                .in_("podcast_id", b)
                .execute()
            )
            if res and res.data:
                for row in res.data:
                    pid = row.get("podcast_id")
                    # PostgREST may return max as "pub_date" or "max"
                    latest = row.get("max") or row.get("pub_date")
                    if pid is not None:
                        id_to_latest[pid] = latest
        except Exception as e:
            # If aggregate not supported or fails, treat all as active (process all)
            console = Console()
            console.print(f"[yellow]Could not get latest episode dates ({e}), processing all feeds[/yellow]")
            return csv_set

    active_feeds = set()
    for feed_url, pid in feed_to_id.items():
        latest = id_to_latest.get(pid)
        # Process if: no episodes yet (latest is None) or latest episode is within ACTIVE_DAYS
        if latest is None:
            active_feeds.add(feed_url)
        else:
            try:
                if isinstance(latest, str):
                    latest_dt = dateparser.parse(latest)
                else:
                    latest_dt = latest
                if latest_dt:
                    # Compare as UTC naive
                    if getattr(latest_dt, "tzinfo", None):
                        latest_utc = latest_dt.astimezone(timezone.utc).replace(tzinfo=None)
                    else:
                        latest_utc = latest_dt
                    if latest_utc >= cutoff:
                        active_feeds.add(feed_url)
            except Exception:
                active_feeds.add(feed_url)  # on parse error, treat as active

    return new_feeds | active_feeds


def delete_podcasts_not_in_csv(csv_feed_urls: set[str]):
    """
    Delete podcasts from database whose feed_url is not in the CSV.
    Returns the number of podcasts deleted.
    """
    if not csv_feed_urls:
        return 0
    
    # Get all podcasts from database
    def _get_all_podcasts():
        return sb.table("podcasts").select("feed_url,title").execute().data
    
    all_podcasts = retry_db_operation(_get_all_podcasts)
    if not all_podcasts:
        return 0
    
    # Find podcasts to delete (not in CSV)
    podcasts_to_delete = []
    for podcast in all_podcasts:
        feed_url = podcast.get("feed_url")
        if feed_url and feed_url not in csv_feed_urls:
            podcasts_to_delete.append(feed_url)
    
    if not podcasts_to_delete:
        return 0
    
    # Delete podcasts not in CSV (episodes cascade automatically)
    deleted_count = 0
    for feed_url in podcasts_to_delete:
        try:
            def _delete():
                return sb.table("podcasts").delete().eq("feed_url", feed_url).execute()
            retry_db_operation(_delete)
            deleted_count += 1
        except Exception as e:
            # Log error but continue deleting others
            print(f"Error deleting podcast {feed_url}: {e}")
    
    return deleted_count


def run_once():
    console = Console()
    all_feeds = read_csv_feeds(CSV_PATH)
    feeds = all_feeds
    if ONLY_DAILY_FEEDS:
        feeds = [f for f in feeds if f[2]]
        if not feeds:
            console.print("[yellow]No feeds marked as daily in CSV (column 'daily' = 1, true, yes, or daily).[/yellow]")
            return
        console.print(f"[cyan]Only processing {len(feeds)} daily feeds (ONLY_DAILY_FEEDS=true)[/cyan]")

    # Only refresh "active" feeds (new or had episode in last ACTIVE_DAYS); skip completed/inactive
    if REFRESH_ACTIVE_ONLY and not (BATCH_SIZE and BATCH_SIZE > 0):
        csv_urls = [f[0] for f in feeds]
        active_urls = get_active_feed_urls(csv_urls)
        feeds = [f for f in feeds if f[0] in active_urls]
        skipped_inactive = len(csv_urls) - len(feeds)
        if skipped_inactive > 0:
            console.print(f"[cyan]✓ Only refreshing active feeds (new or episode in last {ACTIVE_DAYS} days)[/cyan]")
            console.print(f"[cyan]  Processing {len(feeds)} feeds, skipping {skipped_inactive} inactive/complete[/cyan]")

    # Process all feeds unless BATCH_SIZE is explicitly set
    if BATCH_SIZE and BATCH_SIZE > 0:
        feeds_to_process = feeds[:BATCH_SIZE]
        console.print(f"[yellow]⚠ Limiting to first {BATCH_SIZE} feeds out of {len(feeds)} total[/yellow]")
        console.print(f"[yellow]   (To process all feeds, unset REFRESH_BATCH_SIZE or set it to 0/all)[/yellow]")
    else:
        feeds_to_process = feeds
        if not ONLY_DAILY_FEEDS and not REFRESH_ACTIVE_ONLY:
            console.print(f"[green]✓ Processing all {len(all_feeds)} feeds[/green]")
    # Normalize to (feed_url, genre_override) for the loop
    feeds_to_process = [(f[0], f[1]) for f in feeds_to_process]
    total_feeds = len(feeds_to_process)
    
    processed = 0
    skipped = 0
    errors = 0
    new_episodes_added = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, style="green"),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TextColumn("•"),
        TextColumn("[cyan]{task.completed}/{task.total} feeds"),
        TextColumn("•"),
        TextColumn("[green]{task.fields[processed]} processed"),
        TextColumn("[yellow]{task.fields[skipped]} skipped"),
        TextColumn("[red]{task.fields[errors]} errors"),
        TextColumn("[blue]{task.fields[new_eps]} new episodes"),
        TimeElapsedColumn(),
        TimeRemainingColumn(),
        console=console,
        expand=True
    ) as progress:
        task = progress.add_task(
            "[cyan]Processing feeds...",
            total=total_feeds,
            processed=0,
            skipped=0,
            errors=0,
            new_eps=0
        )

        for feed_url, genre_override in feeds_to_process:
            try:
                progress.update(task, description=f"[cyan]Processing: {feed_url[:60]}...")
                
                # Get existing podcast info if available
                if FORCE_REFRESH:
                    etag, last_modified, podcast_id, last_refreshed = None, None, None, None
                else:
                    etag, last_modified, podcast_id, last_refreshed = get_existing_etags(feed_url)
                
                # Check if feed was recently refreshed (could indicate interrupted processing)
                recently_refreshed = was_recently_refreshed(last_refreshed)
                
                # If recently refreshed, force re-fetch to catch any missed episodes
                if recently_refreshed and not FORCE_REFRESH:
                    progress.update(task, description=f"[yellow]Re-processing (was interrupted): {feed_url[:60]}...")
                    # Force fetch by not sending conditional headers
                    meta, items = fetch_and_process(feed_url, None, None, genre_override)
                else:
                    # Fetch and process feed normally
                    meta, items = fetch_and_process(feed_url, etag, last_modified, genre_override)
                
                # Skip if feed hasn't changed (304 Not Modified) and wasn't recently refreshed
                if meta is None and not recently_refreshed:
                    skipped += 1
                    progress.update(
                        task,
                        advance=1,
                        description=f"[yellow]Skipped (unchanged): {feed_url[:60]}...",
                        skipped=skipped
                    )
                    time.sleep(0.05)
                    continue

                # Upsert podcast metadata (always update even if no new episodes)
                podcast_row = upsert_podcast(feed_url, meta)
                podcast_id = podcast_row["id"]
                
                # Check if there are any new episodes before processing
                # Force processing if recently refreshed (might have been interrupted) or FORCE_REFRESH
                force_episode_check = recently_refreshed or FORCE_REFRESH
                if not force_episode_check and not has_new_episodes(podcast_id, items, force_check=False):
                    # Feed updated but no new episodes - skip processing episodes
                    # Podcast metadata was still updated above
                    skipped += 1
                    progress.update(
                        task,
                        advance=1,
                        description=f"[yellow]Skipped (no new episodes): {feed_url[:60]}...",
                        skipped=skipped
                    )
                    time.sleep(0.05)
                    continue
                
                # If recently refreshed, indicate we're re-processing to catch missed episodes
                if recently_refreshed:
                    progress.update(task, description=f"[cyan]Re-processing episodes (catch-up): {feed_url[:60]}...")

                # Process episodes - only new ones will be inserted
                episode_count = 0
                for item in items:
                    if insert_new_episode(podcast_id, item):
                        episode_count += 1
                
                new_episodes_added += episode_count
                processed += 1
                
                status_msg = f"[green]✓ Processed: {feed_url[:50]}... ({episode_count} new)"
                progress.update(
                    task,
                    advance=1,
                    description=status_msg,
                    processed=processed,
                    new_eps=new_episodes_added
                )
                time.sleep(0.05)
                
            except Exception as e:
                errors += 1
                import traceback
                error_msg = f"[red]✗ Error: {feed_url[:50]}... - {str(e)[:40]}"
                progress.update(
                    task,
                    advance=1,
                    description=error_msg,
                    errors=errors
                )
                console.print(f"[red]Error processing {feed_url}:[/red] {e}")
                if os.environ.get("DEBUG", "false").lower() == "true":
                    console.print(traceback.format_exc())
                time.sleep(0.05)

    # Delete podcasts not in CSV (if enabled)
    deleted_count = 0
    if DELETE_MISSING and not (BATCH_SIZE and BATCH_SIZE > 0) and not ONLY_DAILY_FEEDS:
        # Only delete missing when processing full CSV (not batch or daily-only mode)
        console.print(f"\n[yellow]Checking for podcasts to delete...[/yellow]")
        csv_feed_urls = {f[0] for f in all_feeds}
        deleted_count = delete_podcasts_not_in_csv(csv_feed_urls)
        if deleted_count > 0:
            console.print(f"[red]Deleted {deleted_count} podcast(s) not in CSV[/red]")
        else:
            console.print(f"[green]No podcasts to delete (all are in CSV)[/green]")
    elif DELETE_MISSING and (BATCH_SIZE and BATCH_SIZE > 0):
        console.print(f"\n[yellow]⚠ Skipping deletion check (batch mode is active)[/yellow]")
        console.print(f"[yellow]   Set DELETE_MISSING=false to disable deletion, or process all feeds to enable it[/yellow]")

    console.print(f"\n[bold green]✓ Complete![/bold green]")
    console.print(f"  [green]Processed:[/green] {processed}")
    console.print(f"  [yellow]Skipped:[/yellow] {skipped}")
    console.print(f"  [red]Errors:[/red] {errors}")
    console.print(f"  [blue]New episodes added:[/blue] {new_episodes_added}")
    if deleted_count > 0:
        console.print(f"  [red]Deleted (not in CSV):[/red] {deleted_count}")


if __name__ == "__main__":
    try:
        run_once()
    except Exception as e:
        import traceback
        print("Feed ingestor failed:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

