#!/usr/bin/env python3
"""
Utility script to delete podcasts and episodes from Supabase.
Usage examples:
  python delete_podcast.py --feed-url "https://example.com/feed.rss"
  python delete_podcast.py --title "Podcast Name"
  python delete_podcast.py --all  # WARNING: Deletes everything!
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def delete_by_feed_url(feed_url: str):
    """Delete a podcast by its feed URL (episodes cascade automatically)."""
    result = sb.table("podcasts").delete().eq("feed_url", feed_url).execute()
    print(f"Deleted podcast: {feed_url}")
    print(f"Episodes were automatically deleted (cascade)")
    return result


def delete_by_title(title_search: str, confirm_yes: bool = False):
    """Delete podcasts matching a title search (partial match, case-insensitive)."""
    # First, find what we're about to delete
    podcasts = sb.table("podcasts").select("id,title,feed_url").ilike("title", f"%{title_search}%").execute()
    
    if not podcasts.data:
        print(f"No podcasts found matching: {title_search}")
        return
    
    print(f"Found {len(podcasts.data)} podcast(s) matching '{title_search}':")
    for p in podcasts.data:
        print(f"  - {p.get('title')} ({p.get('feed_url')})")
    
    if not confirm_yes:
        confirm = input(f"\nDelete {len(podcasts.data)} podcast(s)? (yes/no): ")
        if confirm.lower() != "yes":
            print("Cancelled.")
            return
    
    for p in podcasts.data:
        result = sb.table("podcasts").delete().eq("id", p["id"]).execute()
        print(f"Deleted: {p.get('title')}")


def delete_all():
    """Delete ALL podcasts (episodes cascade automatically)."""
    # Count first
    count = sb.table("podcasts").select("id", count="exact").execute()
    total = count.count if hasattr(count, 'count') else len(count.data) if count.data else 0
    
    if total == 0:
        print("No podcasts to delete.")
        return
    
    print(f"WARNING: This will delete ALL {total} podcast(s) and all their episodes!")
    confirm = input("Type 'DELETE ALL' to confirm: ")
    
    if confirm != "DELETE ALL":
        print("Cancelled.")
        return
    
    result = sb.table("podcasts").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Deleted all podcasts. Episodes were automatically deleted.")


def list_podcasts():
    """List all podcasts with their feed URLs."""
    podcasts = sb.table("podcasts").select("id,title,feed_url,genre").order("title").execute()
    
    if not podcasts.data:
        print("No podcasts found.")
        return
    
    print(f"\nFound {len(podcasts.data)} podcast(s):\n")
    for p in podcasts.data:
        print(f"  Title: {p.get('title', 'N/A')}")
        print(f"  Feed:  {p.get('feed_url')}")
        print(f"  Genre: {p.get('genre', 'N/A')}")
        print(f"  ID:    {p.get('id')}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nCommands:")
        print("  --list                List all podcasts")
        print("  --feed-url URL        Delete by feed URL")
        print("  --title SEARCH        Delete by title (partial match)")
        print("  --title SEARCH --yes  Delete by title without confirmation")
        print("  --all                 Delete everything (requires confirmation)")
        sys.exit(1)
    
    arg = sys.argv[1]
    confirm_yes = "--yes" in sys.argv
    
    if arg == "--list":
        list_podcasts()
    elif arg == "--feed-url" and len(sys.argv) > 2:
        delete_by_feed_url(sys.argv[2])
    elif arg == "--title" and len(sys.argv) > 2:
        title_arg = sys.argv[2] if sys.argv[2] != "--yes" else (sys.argv[3] if len(sys.argv) > 3 else "")
        if title_arg:
            delete_by_title(title_arg, confirm_yes)
        else:
            print("Error: --title requires a search term")
            sys.exit(1)
    elif arg == "--all":
        delete_all()
    else:
        print("Invalid arguments. Use --help or see docstring.")
        sys.exit(1)

