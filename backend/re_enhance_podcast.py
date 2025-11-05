#!/usr/bin/env python3
"""
Re-enhance a specific podcast by title or ID.
Useful for fixing descriptions that got cut off or need updating.
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
from enhance_descriptions import enhance_description, update_podcast_description, fetch_all_podcasts

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def find_podcast_by_title(title_search: str):
    """Find podcast by title (partial match)."""
    podcasts = fetch_all_podcasts()
    title_lower = title_search.lower()
    
    matches = [p for p in podcasts if title_lower in (p.get("title", "") or "").lower()]
    
    if len(matches) == 0:
        print(f"No podcast found matching: {title_search}")
        return None
    elif len(matches) == 1:
        return matches[0]
    else:
        print(f"Multiple matches found for '{title_search}':")
        for i, p in enumerate(matches, 1):
            print(f"  {i}. {p.get('title')}")
        choice = input("Enter number to select: ").strip()
        try:
            return matches[int(choice) - 1]
        except (ValueError, IndexError):
            print("Invalid selection")
            return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 re_enhance_podcast.py <podcast-title-or-id>")
        print("\nExample:")
        print('  python3 re_enhance_podcast.py "A Passage to India"')
        print('  python3 re_enhance_podcast.py <uuid>')
        sys.exit(1)
    
    search_term = sys.argv[1]
    
    # Try to find by title first
    podcast = find_podcast_by_title(search_term)
    
    if not podcast:
        # Try as UUID
        try:
            result = sb.table("podcasts").select("id,title,author,description").eq("id", search_term).execute()
            if result.data:
                podcast = result.data[0]
            else:
                print(f"Podcast not found: {search_term}")
                sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
    
    print(f"\nFound podcast: {podcast.get('title')}")
    print(f"Author: {podcast.get('author', 'N/A')}")
    print(f"Current description length: {len(podcast.get('description', '') or '')} characters")
    print(f"\nCurrent description:")
    print("-" * 60)
    print(podcast.get('description', '(empty)')[:500])
    if len(podcast.get('description', '') or '') > 500:
        print("...")
    print("-" * 60)
    
    confirm = input("\nRe-enhance this podcast? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Cancelled")
        sys.exit(0)
    
    print("\nEnhancing description...")
    try:
        enhanced = enhance_description(
            podcast.get('description', '') or '',
            podcast.get('title', ''),
            podcast.get('author')
        )
        
        print(f"\nEnhanced description length: {len(enhanced)} characters")
        print(f"\nEnhanced description:")
        print("-" * 60)
        print(enhanced)
        print("-" * 60)
        
        confirm = input("\nUpdate in database? (y/n): ").strip().lower()
        if confirm == 'y':
            update_podcast_description(podcast['id'], enhanced)
            print("✓ Updated successfully!")
        else:
            print("Cancelled - description not updated")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

