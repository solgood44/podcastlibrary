#!/usr/bin/env python3
"""
Script to fetch copyright-free author images from Wikipedia/Wikimedia Commons,
process them (resize + sepia filter), and store them in Supabase Storage.

This script:
1. Searches Wikipedia for author pages
2. Downloads images from Wikimedia Commons
3. Processes images: resize to 400x400, apply sepia filter
4. Uploads processed images to Supabase Storage
5. Stores the storage URL in the database

Usage:
    python3 fetch_and_store_author_images.py [--limit N] [--author "Author Name"]
"""

import os
import sys
import time
import io
import argparse
import urllib.parse
import unicodedata
import re
from typing import Optional
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from PIL import Image, ImageEnhance
import numpy as np

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
console = Console()

# Image processing constants
TARGET_SIZE = (400, 400)
STORAGE_BUCKET = "author-images"  # You'll need to create this bucket in Supabase


def apply_sepia(image: Image.Image) -> Image.Image:
    """
    Apply a sepia tone filter to an image.
    Creates a warm, vintage look while maintaining image clarity.
    """
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Get image data as array
    img_array = np.array(image, dtype=np.float32)
    
    # Sepia formula: R = 0.393*R + 0.769*G + 0.189*B
    #                G = 0.349*R + 0.686*G + 0.168*B
    #                B = 0.272*R + 0.534*G + 0.131*B
    sepia_matrix = np.array([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131]
    ])
    
    # Apply sepia transformation
    sepia_array = np.dot(img_array, sepia_matrix.T)
    
    # Clip values to valid range [0, 255]
    sepia_array = np.clip(sepia_array, 0, 255).astype(np.uint8)
    
    # Convert back to PIL Image
    sepia_image = Image.fromarray(sepia_array)
    
    # Slightly reduce saturation for a more subtle effect
    enhancer = ImageEnhance.Color(sepia_image)
    sepia_image = enhancer.enhance(0.9)
    
    return sepia_image


def smart_crop_face(image: Image.Image) -> Image.Image:
    """
    Smart crop to focus on the face/upper portion of the image.
    Uses a simple heuristic: crop from top-center, focusing on upper 60% of image.
    """
    width, height = image.size
    
    # For portraits, faces are usually in the upper portion
    # Crop to focus on upper 60% of the image, centered horizontally
    crop_height = int(height * 0.6)
    crop_y = 0  # Start from top
    crop_x = max(0, (width - min(width, height)) // 2)  # Center horizontally
    
    # If image is wider than tall, crop to square from center
    if width > height:
        crop_width = height
        crop_x = (width - crop_width) // 2
    else:
        crop_width = width
    
    # Crop the image
    cropped = image.crop((crop_x, crop_y, crop_x + crop_width, crop_y + crop_height))
    
    # Resize cropped portion to square
    cropped.thumbnail((TARGET_SIZE[0], TARGET_SIZE[1]), Image.Resampling.LANCZOS)
    
    return cropped


def process_image(image_data: bytes, focus_face: bool = True) -> bytes:
    """
    Process an image: resize to 400x400 and apply sepia filter.
    Optionally focuses on face/upper portion to reduce white space.
    Returns processed image as bytes (JPEG format).
    """
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed (handles RGBA, P, etc.)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Smart crop to focus on face if enabled
        if focus_face:
            try:
                image = smart_crop_face(image)
            except Exception:
                # If cropping fails, fall back to regular processing
                pass
        
        # Resize to 400x400 with high-quality resampling
        # Use thumbnail to maintain aspect ratio, then pad to square
        image.thumbnail(TARGET_SIZE, Image.Resampling.LANCZOS)
        
        # Create a new square image with white background
        square_image = Image.new('RGB', TARGET_SIZE, (255, 255, 255))
        
        # Calculate position to center the image
        x = (TARGET_SIZE[0] - image.size[0]) // 2
        y = (TARGET_SIZE[1] - image.size[1]) // 2
        
        # Paste the resized image onto the square canvas
        square_image.paste(image, (x, y))
        
        # Apply sepia filter
        processed_image = apply_sepia(square_image)
        
        # Convert to bytes (JPEG format, high quality)
        output = io.BytesIO()
        processed_image.save(output, format='JPEG', quality=85, optimize=True)
        return output.getvalue()
        
    except Exception as e:
        console.print(f"[red]Error processing image: {e}[/red]")
        raise


def download_image(image_url: str) -> Optional[bytes]:
    """
    Download an image from a URL.
    """
    try:
        headers = {
            'User-Agent': 'PodcastLibrary/1.0 (https://podcastlibrary.org; contact@podcastlibrary.org)'
        }
        
        with httpx.Client(timeout=30, follow_redirects=True, headers=headers) as client:
            response = client.get(image_url)
            if response.status_code == 200:
                return response.content
            else:
                console.print(f"[yellow]Failed to download image: HTTP {response.status_code}[/yellow]")
                return None
    except Exception as e:
        console.print(f"[red]Error downloading image: {e}[/red]")
        return None


def get_direct_image_url(wikimedia_url: str) -> str:
    """
    Convert a Wikimedia Commons URL to a direct download URL.
    Handles thumbnail URLs, Special:FilePath URLs, and direct URLs.
    """
    # If it's already a direct upload.wikimedia.org URL (not thumbnail), return it
    if "upload.wikimedia.org" in wikimedia_url and "/thumb/" not in wikimedia_url:
        return wikimedia_url
    
    # If it's a thumbnail URL, convert to full-size
    if "upload.wikimedia.org" in wikimedia_url and "/thumb/" in wikimedia_url:
        # Format: https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Filename.jpg/400px-Filename.jpg
        # We want: https://upload.wikimedia.org/wikipedia/commons/a/ab/Filename.jpg
        parts = wikimedia_url.split("/thumb/")
        if len(parts) == 2:
            base = parts[0]  # https://upload.wikimedia.org/wikipedia/commons
            rest = parts[1]  # a/ab/Filename.jpg/400px-Filename.jpg
            # Split by / and take first 3 parts (hash1, hash2, filename)
            path_parts = rest.split("/")
            if len(path_parts) >= 3:
                # Get the actual filename (before the size prefix)
                filename = path_parts[2].split("?")[0]
                # Reconstruct direct URL
                direct_url = f"{base}/{path_parts[0]}/{path_parts[1]}/{filename}"
                return direct_url
    
    # If it's a Special:FilePath URL, we need to get the actual file URL
    # This is trickier - we'll try to construct it from the filename
    if "Special:FilePath" in wikimedia_url or "wiki/" in wikimedia_url:
        # Extract filename
        if "Special:FilePath" in wikimedia_url:
            filename = wikimedia_url.split("Special:FilePath/")[-1].split("?")[0]
        else:
            # Extract from /wiki/File: format
            filename = wikimedia_url.split("/wiki/")[-1].split("?")[0]
            if filename.startswith("File:"):
                filename = filename[5:]  # Remove "File:" prefix
        
        filename = urllib.parse.unquote(filename)
        
        # Wikimedia Commons uses first character and first two characters as hash
        if len(filename) > 0:
            hash_char = filename[0].lower()
            if len(filename) > 1:
                hash_char2 = filename[1].lower()
                # Construct direct URL
                direct_url = f"https://upload.wikimedia.org/wikipedia/commons/{hash_char}/{hash_char}{hash_char2}/{filename}"
                return direct_url
    
    # Fallback: return original URL (might work, might not)
    return wikimedia_url


def upload_to_storage(author_name: str, image_data: bytes) -> Optional[str]:
    """
    Upload processed image to Supabase Storage.
    Returns the public URL of the uploaded image.
    """
    try:
        # Generate filename from author name
        # Remove or replace special characters that Supabase Storage doesn't allow
        # Normalize unicode characters (convert á to a, etc.)
        normalized = unicodedata.normalize('NFKD', author_name)
        # Remove non-ASCII characters (this also removes accents like á, é, etc.)
        ascii_name = normalized.encode('ascii', 'ignore').decode('ascii')
        # Remove apostrophes entirely (they cause issues in filenames)
        ascii_name = ascii_name.replace("'", "").replace("'", "").replace('"', '')
        # Keep only alphanumeric, spaces, hyphens, and underscores
        safe_name = re.sub(r'[^a-zA-Z0-9\s\-_]', '', ascii_name)
        # Replace spaces with underscores and convert to lowercase
        safe_name = safe_name.strip().replace(' ', '_').lower()
        # Remove multiple underscores and leading/trailing underscores
        safe_name = re.sub(r'_+', '_', safe_name).strip('_')
        # Ensure we have a valid name
        if not safe_name:
            safe_name = "author"
        
        filename = f"{safe_name}.jpg"
        
        # Upload to storage
        # Supabase Python client expects file-like object or bytes
        file_response = sb.storage.from_(STORAGE_BUCKET).upload(
            filename,
            image_data,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "true"
            }
        )
        
        # Get public URL
        # Construct public URL manually (Supabase Storage public URL format)
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{filename}"
        
        return public_url
        
    except Exception as e:
        console.print(f"[red]Error uploading to storage: {e}[/red]")
        # Check if bucket exists, if not, provide instructions
        error_str = str(e).lower()
        if "bucket" in error_str and ("not found" in error_str or "does not exist" in error_str):
            console.print(f"[yellow]⚠ Storage bucket '{STORAGE_BUCKET}' not found.[/yellow]")
            console.print(f"[yellow]Please create it in Supabase Dashboard → Storage → New Bucket[/yellow]")
            console.print(f"[yellow]Make it public so images can be accessed.[/yellow]")
        return None


def search_wikipedia_author(author_name: str) -> Optional[dict]:
    """
    Search Wikipedia for an author page and return page info including image URL.
    """
    try:
        headers = {
            'User-Agent': 'PodcastLibrary/1.0 (https://podcastlibrary.org; contact@podcastlibrary.org)'
        }
        
        with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
            encoded_name = urllib.parse.quote(author_name.replace(" ", "_"), safe='')
            search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_name}"
            
            response = client.get(search_url)
            
            if response.status_code == 404:
                # Try with spaces
                search_api_url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(author_name, safe='')
                search_response = client.get(search_api_url)
                if search_response.status_code == 200:
                    response = search_response
            
            if response.status_code == 200:
                data = response.json()
                if data.get("type") == "disambiguation":
                    return None
                
                # Get thumbnail
                thumbnail = data.get("thumbnail")
                if thumbnail and thumbnail.get("source"):
                    return {
                        "title": data.get("title", author_name),
                        "image_url": thumbnail.get("source"),
                        "description": data.get("extract", "")
                    }
                
                # Try to get images from page
                page_title = data.get("title", author_name).replace(" ", "_")
                encoded_page_title = urllib.parse.quote(page_title, safe='')
                images_url = f"https://en.wikipedia.org/api/rest_v1/page/media/{encoded_page_title}"
                
                images_response = client.get(images_url)
                if images_response.status_code == 200:
                    images_data = images_response.json()
                    for item in images_data.get("items", []):
                        if item.get("type") == "image":
                            file_name = item.get("title", "").replace("File:", "")
                            if file_name:
                                # Use Special:FilePath for uniform sizing
                                formatted_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file_name.replace(' ', '_'), safe='')}?width=800"
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
        return None
    except Exception as e:
        return None


def update_author_image(author_name: str, storage_url: str) -> bool:
    """
    Update the author's image_url in the database with Supabase Storage URL.
    """
    try:
        result = sb.table("authors").select("id").eq("name", author_name).execute()
        
        if result.data:
            sb.table("authors").update({
                "image_url": storage_url
            }).eq("name", author_name).execute()
            return True
        else:
            sb.table("authors").insert({
                "name": author_name,
                "image_url": storage_url
            }).execute()
            return True
    except Exception as e:
        console.print(f"[red]Error updating author {author_name}: {e}[/red]")
        return False


def get_existing_storage_images() -> dict[str, str]:
    """
    Get list of existing images in the storage bucket.
    Returns a dict mapping author names (from filename) to storage URLs.
    """
    try:
        # List all files in the bucket
        files = sb.storage.from_(STORAGE_BUCKET).list()
        
        existing = {}
        for file_info in files:
            if file_info.get('name', '').endswith('.jpg'):
                # Extract author name from filename (remove .jpg)
                filename = file_info['name']
                author_name = filename[:-4].replace('_', ' ').title()
                # Store the public URL
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{filename}"
                existing[author_name] = public_url
        
        return existing
    except Exception as e:
        console.print(f"[yellow]Could not list existing images: {e}[/yellow]")
        return {}


def process_existing_image(author_name: str, image_url: str) -> Optional[str]:
    """
    Download an existing image from storage, reprocess it, and re-upload.
    """
    try:
        # Download the image
        image_data = download_image(image_url)
        if not image_data:
            return None
        
        # Process with face focus
        processed_data = process_image(image_data, focus_face=True)
        
        # Re-upload
        storage_url = upload_to_storage(author_name, processed_data)
        return storage_url
    except Exception as e:
        console.print(f"[red]Error processing existing image: {e}[/red]")
        return None


def fetch_all_authors() -> list[str]:
    """
    Get all unique authors from podcasts.
    """
    try:
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
    parser = argparse.ArgumentParser(description="Fetch and store author images from Wikipedia")
    parser.add_argument("--limit", type=int, help="Limit number of authors to process")
    parser.add_argument("--author", type=str, help="Process a specific author only")
    parser.add_argument("--dry-run", action="store_true", help="Don't upload, just show what would be processed")
    parser.add_argument("--skip-existing", action="store_true", help="Skip authors that already have images")
    parser.add_argument("--reprocess-existing", action="store_true", help="Reprocess existing images in bucket (with face focus)")
    
    args = parser.parse_args()
    
    if args.author:
        authors = [args.author]
    else:
        authors = fetch_all_authors()
        if args.limit:
            authors = authors[:args.limit]
    
    # If reprocessing existing, get list of images in bucket
    existing_images = {}
    if args.reprocess_existing:
        console.print("[cyan]Checking existing images in bucket...[/cyan]")
        existing_images = get_existing_storage_images()
        console.print(f"[cyan]Found {len(existing_images)} existing images[/cyan]")
    
    console.print(f"[green]Processing {len(authors)} authors...[/green]")
    
    found = 0
    not_found = 0
    errors = 0
    skipped = 0
    reprocessed = 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TextColumn("•"),
        TextColumn("[green]{task.fields[found]} found"),
        TextColumn("[yellow]{task.fields[not_found]} not found"),
        TextColumn("[red]{task.fields[errors]} errors"),
        TextColumn("[cyan]{task.fields[skipped]} skipped"),
        TextColumn("[blue]{task.fields[reprocessed]} reprocessed"),
        console=console
    ) as progress:
        task = progress.add_task("Processing images...", total=len(authors), found=0, not_found=0, errors=0, skipped=0, reprocessed=0)
        
        for author in authors:
            progress.update(task, description=f"Processing: {author[:50]}")
            
            try:
                # Check if author already has image
                if args.skip_existing:
                    result = sb.table("authors").select("image_url").eq("name", author).execute()
                    if result.data and result.data[0].get("image_url"):
                        skipped += 1
                        progress.update(task, skipped=skipped)
                        continue
                
                # If reprocessing existing, check if image exists in bucket
                if args.reprocess_existing:
                    # Try to find existing image by matching author name
                    existing_url = None
                    for existing_author, url in existing_images.items():
                        # Fuzzy match - check if author names are similar
                        if author.lower() in existing_author.lower() or existing_author.lower() in author.lower():
                            existing_url = url
                            break
                    
                    if existing_url:
                        # Reprocess existing image
                        storage_url = process_existing_image(author, existing_url)
                        if storage_url:
                            if update_author_image(author, storage_url):
                                reprocessed += 1
                                progress.update(task, reprocessed=reprocessed)
                                console.print(f"[blue]↻[/blue] {author}: Reprocessed")
                                continue
                
                # Search Wikipedia
                result = search_wikipedia_author(author)
                
                if result and result.get("image_url"):
                    wikimedia_url = result["image_url"]
                    
                    if args.dry_run:
                        found += 1
                        progress.update(task, found=found)
                        console.print(f"[green]✓[/green] {author}: Would download and process")
                    else:
                        # Get direct download URL
                        direct_url = get_direct_image_url(wikimedia_url)
                        
                        # Download image
                        image_data = download_image(direct_url)
                        if not image_data:
                            not_found += 1
                            progress.update(task, not_found=not_found)
                            continue
                        
                        # Process image (with face focus enabled)
                        try:
                            processed_data = process_image(image_data, focus_face=True)
                        except Exception as e:
                            console.print(f"[red]Error processing image for {author}: {e}[/red]")
                            errors += 1
                            progress.update(task, errors=errors)
                            continue
                        
                        # Upload to storage
                        storage_url = upload_to_storage(author, processed_data)
                        if not storage_url:
                            errors += 1
                            progress.update(task, errors=errors)
                            continue
                        
                        # Update database
                        if update_author_image(author, storage_url):
                            found += 1
                            progress.update(task, found=found)
                            console.print(f"[green]✓[/green] {author}: {storage_url}")
                        else:
                            errors += 1
                            progress.update(task, errors=errors)
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
    console.print(f"  [green]Found and processed: {found}[/green]")
    console.print(f"  [yellow]Not found: {not_found}[/yellow]")
    console.print(f"  [red]Errors: {errors}[/red]")
    if skipped > 0:
        console.print(f"  [cyan]Skipped (already have images): {skipped}[/cyan]")
    if reprocessed > 0:
        console.print(f"  [blue]Reprocessed: {reprocessed}[/blue]")


if __name__ == "__main__":
    main()

