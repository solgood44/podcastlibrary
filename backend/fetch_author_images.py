#!/usr/bin/env python3
"""
Script to fetch copyright-free author images from Wikipedia/Wikimedia Commons
and store them in the authors table.

This script:
1. Searches Wikipedia for author pages
2. Extracts image URLs from Wikimedia Commons
3. Uses Wikimedia Commons thumbnail API to get uniform 400x400 images
4. Stores the formatted image URL in the database

Usage:
    python fetch_author_images.py [--limit N] [--author "Author Name"]
"""

import os
import sys
import time
import json
import argparse
import urllib.parse
from typing import Optional
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.table import Table

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
console = Console()

# Wikimedia Commons thumbnail API
# Format: https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=400
# Or use: https://upload.wikimedia.org/wikipedia/commons/thumb/{hash}/{filename}/{size}-{filename}

def search_wikipedia_author(author_name: str) -> Optional[dict]:
    """
    Search Wikipedia for an author page and return page info including image.
    Uses Wikipedia REST API to get page summary and images.
    """
    try:
        # Add user agent to avoid 403 errors
        headers = {
            'User-Agent': 'PodcastLibrary/1.0 (https://podcastlibrary.org; contact@podcastlibrary.org)'
        }
        
        with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
            # First, try to get page summary (handles redirects automatically)
            # URL encode the author name properly
            encoded_name = urllib.parse.quote(author_name.replace(" ", "_"), safe='')
            search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_name}"
            
            response = client.get(search_url)
            
            # If direct lookup fails, try searching
            if response.status_code == 404:
                # Try Wikipedia search API
                search_api_url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(author_name, safe='')
                search_response = client.get(search_api_url)
                if search_response.status_code == 200:
                    response = search_response
                else:
                    # Try with underscores
                    search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(author_name.replace(' ', '_'), safe='')}"
                    response = client.get(search_url)
            
            if response.status_code == 200:
                data = response.json()
                # Check if it's a disambiguation page
                if data.get("type") == "disambiguation":
                    return None
                
                # Get the thumbnail image URL if available
                thumbnail = data.get("thumbnail")
                if thumbnail and thumbnail.get("source"):
                    # The thumbnail URL from Wikipedia API is already formatted
                    # But we want a larger, square version
                    original_url = thumbnail.get("source")
                    # Convert to 400x400 square thumbnail
                    formatted_url = get_wikimedia_thumbnail(original_url, 400)
                    
                    return {
                        "title": data.get("title", author_name),
                        "image_url": formatted_url,
                        "description": data.get("extract", "")
                    }
                
                # If no thumbnail in summary, try to get images from the page
                # Use the page title from the summary (handles redirects)
                page_title = data.get("title", author_name).replace(" ", "_")
                encoded_page_title = urllib.parse.quote(page_title, safe='')
                images_url = f"https://en.wikipedia.org/api/rest_v1/page/media/{encoded_page_title}"
                
                images_response = client.get(images_url)
                if images_response.status_code == 200:
                    images_data = images_response.json()
                    # Look for portrait/photo images first
                    for item in images_data.get("items", []):
                        if item.get("type") == "image":
                            file_name = item.get("title", "").replace("File:", "")
                            if file_name:
                                # Prefer images that look like portraits
                                lower_name = file_name.lower()
                                if any(keyword in lower_name for keyword in ["photo", "portrait", "headshot", "author", "writer"]):
                                    formatted_url = get_wikimedia_thumbnail_from_filename(file_name, 400)
                                    return {
                                        "title": data.get("title", author_name),
                                        "image_url": formatted_url,
                                        "description": data.get("extract", "")
                                    }
                    
                    # If no portrait found, use first image
                    for item in images_data.get("items", []):
                        if item.get("type") == "image":
                            file_name = item.get("title", "").replace("File:", "")
                            if file_name:
                                formatted_url = get_wikimedia_thumbnail_from_filename(file_name, 400)
                                return {
                                    "title": data.get("title", author_name),
                                    "image_url": formatted_url,
                                    "description": data.get("extract", "")
                                }
                
                return None
            else:
                return None
                
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return None
        console.print(f"[yellow]HTTP error for {author_name}: {e.response.status_code}[/yellow]")
        return None
    except Exception as e:
        console.print(f"[red]Error searching Wikipedia for {author_name}: {e}[/red]")
        return None


def get_wikimedia_thumbnail_from_filename(filename: str, size: int = 400) -> str:
    """
    Get a thumbnail URL from a Wikimedia Commons filename.
    Uses the Special:FilePath endpoint which automatically formats images.
    """
    # Clean filename
    filename = filename.replace("File:", "").strip()
    # URL encode the filename
    import urllib.parse
    encoded_filename = urllib.parse.quote(filename.replace(" ", "_"))
    # Use Special:FilePath which handles thumbnails automatically
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded_filename}?width={size}"


def get_wikimedia_thumbnail(image_url: str, size: int = 400) -> str:
    """
    Convert a Wikimedia Commons image URL to a thumbnail URL.
    Handles both direct image URLs and existing thumbnail URLs.
    """
    # If it's already a thumbnail URL with the right size, return it
    if f"width={size}" in image_url or f"{size}px-" in image_url:
        return image_url
    
    # Extract filename from various URL formats
    filename = None
    
    # Format 1: Thumbnail URL: https://upload.wikimedia.org/wikipedia/commons/thumb/{hash}/{filename}/{size}px-{filename}
    if "upload.wikimedia.org" in image_url and "/thumb/" in image_url:
        # Extract the original filename from thumbnail URL
        # Format: .../thumb/2/28/Albert_Einstein_Head_cleaned.jpg/330px-Albert_Einstein_Head_cleaned.jpg
        parts = image_url.split("/")
        # Find the part that ends with .jpg, .png, etc. (the original filename)
        for i, part in enumerate(parts):
            if "." in part and any(part.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                # Check if next part is a thumbnail (contains 'px-')
                if i + 1 < len(parts) and 'px-' in parts[i + 1]:
                    filename = part
                    break
        # If we found a filename, use it to generate new thumbnail
        if filename:
            return get_wikimedia_thumbnail_from_filename(filename, size)
    
    # Format 2: Direct image URL: https://upload.wikimedia.org/wikipedia/commons/{hash}/{filename}
    if "upload.wikimedia.org" in image_url and "/thumb/" not in image_url:
        parts = image_url.split("/")
        if "commons" in parts or "en" in parts:
            # Find the filename (last part before query params)
            for i, part in enumerate(parts):
                if part in ["commons", "en"] and i + 2 < len(parts):
                    filename = parts[i + 2].split("?")[0]
                    break
    
    # Format 3: URL contains File: or filename
    if not filename:
        if "File:" in image_url:
            filename = image_url.split("File:")[-1].split("?")[0].split("/")[-1]
        elif "/wiki/" in image_url:
            # Extract from wiki URL
            parts = image_url.split("/wiki/")
            if len(parts) > 1:
                filename = parts[1].split("?")[0].replace("File:", "")
    
    if filename:
        return get_wikimedia_thumbnail_from_filename(filename, size)
    
    # If we can't parse it, try to modify the URL directly for non-thumbnail URLs
    if "upload.wikimedia.org" in image_url and "/thumb/" not in image_url:
        # Try to convert to thumbnail format
        parts = image_url.split("/")
        if len(parts) >= 2:
            # Insert 'thumb' before the hash/filename
            for i, part in enumerate(parts):
                if part in ["commons", "en"] and i + 2 < len(parts):
                    hash_part = parts[i + 1]
                    orig_filename = parts[i + 2].split("?")[0]
                    # Reconstruct as thumbnail URL
                    base = "/".join(parts[:i+1])
                    return f"{base}/thumb/{hash_part}/{orig_filename}/{size}px-{orig_filename}"
    
    # Return original if we can't format it
    return image_url


def update_author_image(author_name: str, image_url: str) -> bool:
    """
    Update the author's image_url in the database.
    """
    try:
        # Check if author exists
        result = sb.table("authors").select("id").eq("name", author_name).execute()
        
        if result.data:
            # Update existing author
            sb.table("authors").update({
                "image_url": image_url
            }).eq("name", author_name).execute()
            return True
        else:
            # Create new author entry
            sb.table("authors").insert({
                "name": author_name,
                "image_url": image_url
            }).execute()
            return True
    except Exception as e:
        console.print(f"[red]Error updating author {author_name}: {e}[/red]")
        return False


def fetch_all_authors() -> list[str]:
    """
    Get all unique authors from podcasts.
    """
    try:
        # Fetch all podcasts to get unique authors
        result = sb.table("podcasts").select("author").execute()
        authors = set()
        
        for podcast in result.data:
            author = podcast.get("author")
            if author and ".com" not in author.lower():
                authors.add(author)
        
        return sorted(list(authors))
    except Exception as e:
        console.print(f"[red]Error fetching authors: {e}[/red]")
        return []


def main():
    parser = argparse.ArgumentParser(description="Fetch author images from Wikipedia")
    parser.add_argument("--limit", type=int, help="Limit number of authors to process")
    parser.add_argument("--author", type=str, help="Process a specific author only")
    parser.add_argument("--dry-run", action="store_true", help="Don't update database, just show what would be found")
    
    args = parser.parse_args()
    
    if args.author:
        authors = [args.author]
    else:
        authors = fetch_all_authors()
        if args.limit:
            authors = authors[:args.limit]
    
    console.print(f"[green]Processing {len(authors)} authors...[/green]")
    
    found = 0
    not_found = 0
    errors = 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TextColumn("•"),
        TextColumn("[green]{task.fields[found]} found"),
        TextColumn("[yellow]{task.fields[not_found]} not found"),
        TextColumn("[red]{task.fields[errors]} errors"),
        console=console
    ) as progress:
        task = progress.add_task("Fetching images...", total=len(authors), found=0, not_found=0, errors=0)
        
        for author in authors:
            progress.update(task, description=f"Processing: {author[:50]}")
            
            try:
                result = search_wikipedia_author(author)
                
                if result and result.get("image_url"):
                    image_url = get_wikimedia_thumbnail(result["image_url"], 400)
                    
                    if not args.dry_run:
                        if update_author_image(author, image_url):
                            found += 1
                            progress.update(task, found=found)
                            console.print(f"[green]✓[/green] {author}: {image_url}")
                        else:
                            errors += 1
                            progress.update(task, errors=errors)
                    else:
                        found += 1
                        progress.update(task, found=found)
                        console.print(f"[green]✓[/green] {author}: {image_url} (dry-run)")
                else:
                    not_found += 1
                    progress.update(task, not_found=not_found)
                    console.print(f"[yellow]✗[/yellow] {author}: No image found")
                
                # Be respectful to Wikipedia API
                time.sleep(0.5)
                
            except Exception as e:
                errors += 1
                progress.update(task, errors=errors)
                console.print(f"[red]✗[/red] {author}: Error - {e}")
            
            progress.advance(task)
    
    # Summary
    console.print("\n[bold]Summary:[/bold]")
    console.print(f"  [green]Found: {found}[/green]")
    console.print(f"  [yellow]Not found: {not_found}[/yellow]")
    console.print(f"  [red]Errors: {errors}[/red]")


if __name__ == "__main__":
    main()

