#!/usr/bin/env python3
"""
Script to upload nature sounds MP3 files to Supabase Storage and populate the sounds table.

This script:
1. Scans the specified folder for MP3 files
2. Extracts metadata (title, duration)
3. Uploads MP3 files to Supabase Storage
4. Populates the sounds table with metadata

Usage:
    python3 upload_sounds.py [--folder PATH] [--dry-run]
"""

import os
import sys
import argparse
import re
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
import mutagen
from mutagen.mp3 import MP3
from PIL import Image
import pytesseract

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
console = Console()

STORAGE_BUCKET = "sounds"  # You'll need to create this bucket in Supabase
IMAGE_BUCKET = "sound-images"  # Bucket for sound images


def get_audio_duration(file_path: str) -> Optional[int]:
    """Get duration of audio file in seconds."""
    try:
        audio = MP3(file_path)
        return int(audio.info.length)
    except Exception as e:
        console.print(f"[yellow]Warning: Could not get duration for {file_path}: {e}[/yellow]")
        return None


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for storage."""
    # Remove extension
    name = Path(filename).stem
    # Keep only alphanumeric, spaces, hyphens, and underscores
    safe_name = re.sub(r'[^a-zA-Z0-9\s\-_]', '', name)
    # Replace spaces with underscores
    safe_name = safe_name.strip().replace(' ', '_').lower()
    # Remove multiple underscores
    safe_name = re.sub(r'_+', '_', safe_name).strip('_')
    return safe_name


def extract_category(title: str) -> str:
    """Extract category from sound title."""
    title_lower = title.lower()
    
    # Water-related
    if any(word in title_lower for word in ['ocean', 'wave', 'water', 'stream', 'brook', 'waterfall', 'tidepool']):
        return 'water'
    # Rain-related
    elif any(word in title_lower for word in ['rain', 'rainfall', 'dripping']):
        return 'rain'
    # Wind-related
    elif 'wind' in title_lower:
        return 'wind'
    # Thunder-related
    elif 'thunder' in title_lower:
        return 'thunder'
    # Bird-related
    elif any(word in title_lower for word in ['bird', 'woodpecker', 'peeper']):
        return 'birds'
    # Insect-related
    elif any(word in title_lower for word in ['cricket', 'katydid', 'insect', 'peeper']):
        return 'insects'
    # Forest-related
    elif any(word in title_lower for word in ['forest', 'wood', 'swamp']):
        return 'forest'
    # Night-related
    elif 'night' in title_lower or 'dusk' in title_lower:
        return 'night'
    # Snow-related
    elif 'snow' in title_lower or 'icicle' in title_lower:
        return 'snow'
    # Default
    else:
        return 'nature'


def check_bucket_exists() -> bool:
    """Check if the storage bucket exists."""
    try:
        buckets = sb.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        return STORAGE_BUCKET in bucket_names
    except Exception as e:
        console.print(f"[yellow]Warning: Could not check if bucket exists: {e}[/yellow]")
        return False


def upload_sound_to_storage(file_path: str, title: str) -> Optional[str]:
    """
    Upload MP3 file to Supabase Storage.
    Returns the public URL of the uploaded file.
    """
    try:
        # Read file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Generate safe filename
        original_filename = Path(file_path).name
        safe_name = sanitize_filename(original_filename)
        filename = f"{safe_name}.mp3"
        
        # Upload to storage
        file_response = sb.storage.from_(STORAGE_BUCKET).upload(
            filename,
            file_data,
            file_options={
                "content-type": "audio/mpeg",
                "upsert": "true"
            }
        )
        
        # Get public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{filename}"
        
        return public_url
        
    except Exception as e:
        error_str = str(e).lower()
        # Check if bucket exists
        if "bucket" in error_str and ("not found" in error_str or "does not exist" in error_str):
            console.print(f"[red]Error: Storage bucket '{STORAGE_BUCKET}' not found.[/red]")
            console.print(f"[yellow]Please create it in Supabase Dashboard → Storage → New Bucket[/yellow]")
            console.print(f"[yellow]Name: {STORAGE_BUCKET}[/yellow]")
            console.print(f"[yellow]Make it PUBLIC so sounds can be accessed.[/yellow]")
            raise  # Re-raise to stop processing
        else:
            console.print(f"[red]Error uploading {file_path}: {e}[/red]")
            return None


def insert_sound_to_db(title: str, audio_url: str, duration_seconds: Optional[int], category: str, image_url: Optional[str] = None) -> bool:
    """Insert sound record into database."""
    try:
        data = {
            'title': title,
            'audio_url': audio_url,
            'duration_seconds': duration_seconds,
            'category': category,
            'is_premium': False  # Set to True later for premium sounds
        }
        if image_url:
            data['image_url'] = image_url
        
        result = sb.table('sounds').insert(data).execute()
        
        return True
    except Exception as e:
        console.print(f"[red]Error inserting sound {title}: {e}[/red]")
        return False


def check_sound_exists(title: str) -> bool:
    """Check if sound already exists in database."""
    try:
        result = sb.table('sounds').select('id').eq('title', title).execute()
        return len(result.data) > 0
    except Exception as e:
        console.print(f"[yellow]Warning: Could not check if sound exists: {e}[/yellow]")
        return False


def extract_text_from_image(image_path: str) -> Optional[str]:
    """Extract text from image using OCR."""
    try:
        image = Image.open(image_path)
        # Use OCR to extract text
        text = pytesseract.image_to_string(image, lang='eng')
        # Clean up the text
        text = ' '.join(text.split())  # Normalize whitespace
        return text.strip() if text.strip() else None
    except pytesseract.TesseractNotFoundError:
        console.print(f"[red]Error: Tesseract OCR not installed. Install it with: brew install tesseract[/red]")
        raise
    except Exception as e:
        console.print(f"[yellow]Warning: Could not extract text from {image_path}: {e}[/yellow]")
        return None


def find_best_match(extracted_text: str, sound_titles: List[str]) -> Optional[str]:
    """Find the best matching sound title from extracted text."""
    if not extracted_text:
        return None
    
    extracted_lower = extracted_text.lower()
    
    # Try exact match first
    for title in sound_titles:
        if title.lower() in extracted_lower or extracted_lower in title.lower():
            return title
    
    # Try word-by-word matching
    extracted_words = set(re.findall(r'\b\w+\b', extracted_lower))
    best_match = None
    best_score = 0
    
    for title in sound_titles:
        title_words = set(re.findall(r'\b\w+\b', title.lower()))
        # Calculate similarity score
        common_words = extracted_words.intersection(title_words)
        if len(common_words) > 0:
            score = len(common_words) / max(len(extracted_words), len(title_words))
            if score > best_score and score > 0.3:  # At least 30% match
                best_score = score
                best_match = title
    
    return best_match


def normalize_title(title: str) -> str:
    """Normalize title for matching (lowercase, remove special chars)."""
    # Remove extension if present
    title = Path(title).stem
    # Lowercase and remove special characters
    normalized = re.sub(r'[^\w\s]', '', title.lower())
    # Normalize whitespace
    normalized = ' '.join(normalized.split())
    return normalized


def match_by_filename(image_filename: str, sound_titles: List[str]) -> Optional[str]:
    """Try to match image filename to sound title."""
    image_title = normalize_title(image_filename)
    
    # Try exact match first
    for sound_title in sound_titles:
        if normalize_title(sound_title) == image_title:
            return sound_title
    
    # Try partial match (image title contains sound title or vice versa)
    for sound_title in sound_titles:
        sound_normalized = normalize_title(sound_title)
        if image_title in sound_normalized or sound_normalized in image_title:
            return sound_title
    
    return None


def match_images_to_sounds(image_folder: str, sound_titles: List[str], use_ocr: bool = False) -> Dict[str, str]:
    """Match image files to sound titles using filename matching (or OCR if enabled)."""
    image_folder_path = Path(image_folder)
    if not image_folder_path.exists():
        console.print(f"[yellow]Image folder not found: {image_folder}[/yellow]")
        return {}
    
    # Find all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    image_files = []
    for ext in image_extensions:
        image_files.extend(image_folder_path.glob(f'*{ext}'))
    
    if not image_files:
        console.print(f"[yellow]No image files found in {image_folder}[/yellow]")
        return {}
    
    console.print(f"[cyan]Found {len(image_files)} image files. Matching by filename...[/cyan]")
    
    matches = {}
    unmatched_images = []
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console
    ) as progress:
        task = progress.add_task("Matching images to sounds...", total=len(image_files))
        
        for image_file in image_files:
            # First try filename matching
            match = match_by_filename(image_file.name, sound_titles)
            
            if match:
                matches[match] = str(image_file)
                console.print(f"[green]✓ Matched: {image_file.name} → {match}[/green]")
            elif use_ocr:
                # Fall back to OCR if enabled
                extracted_text = extract_text_from_image(str(image_file))
                if extracted_text:
                    match = find_best_match(extracted_text, sound_titles)
                    if match:
                        matches[match] = str(image_file)
                        console.print(f"[green]✓ Matched (OCR): {image_file.name} → {match}[/green]")
                    else:
                        unmatched_images.append((image_file.name, extracted_text[:50]))
                        console.print(f"[yellow]⚠ No match for: {image_file.name} (extracted: {extracted_text[:50]}...)[/yellow]")
                else:
                    unmatched_images.append((image_file.name, "No text extracted"))
                    console.print(f"[yellow]⚠ No match for: {image_file.name} (no text extracted)[/yellow]")
            else:
                unmatched_images.append((image_file.name, "Filename didn't match"))
                console.print(f"[yellow]⚠ No match for: {image_file.name}[/yellow]")
            
            progress.update(task, advance=1)
    
    if unmatched_images:
        console.print(f"\n[yellow]Unmatched images ({len(unmatched_images)}):[/yellow]")
        for img_name, reason in unmatched_images[:10]:  # Show first 10
            console.print(f"  - {img_name}: {reason}")
        if len(unmatched_images) > 10:
            console.print(f"  ... and {len(unmatched_images) - 10} more")
    
    return matches


def upload_image_to_storage(image_path: str, sound_title: str) -> Optional[str]:
    """Upload image to Supabase Storage."""
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Generate safe filename
        safe_name = sanitize_filename(sound_title)
        filename = f"{safe_name}.jpg"
        
        # Upload to storage
        file_response = sb.storage.from_(IMAGE_BUCKET).upload(
            filename,
            image_data,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "true"
            }
        )
        
        # Get public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{IMAGE_BUCKET}/{filename}"
        return public_url
        
    except Exception as e:
        console.print(f"[red]Error uploading image {image_path}: {e}[/red]")
        return None


def update_sound_image(sound_title: str, image_url: str) -> bool:
    """Update sound record with image URL."""
    try:
        result = sb.table('sounds').update({
            'image_url': image_url
        }).eq('title', sound_title).execute()
        
        return True
    except Exception as e:
        console.print(f"[red]Error updating image for {sound_title}: {e}[/red]")
        return False


def process_sound_file(file_path: str, dry_run: bool = False) -> bool:
    """Process a single sound file."""
    filename = Path(file_path).name
    title = Path(file_path).stem  # Title without extension
    
    console.print(f"\n[cyan]Processing: {title}[/cyan]")
    
    # Check if already exists
    if check_sound_exists(title):
        console.print(f"[yellow]⏭  Sound '{title}' already exists, skipping...[/yellow]")
        return True
    
    # Get duration
    duration = get_audio_duration(file_path)
    if duration:
        console.print(f"[green]Duration: {duration} seconds[/green]")
    
    # Extract category
    category = extract_category(title)
    console.print(f"[green]Category: {category}[/green]")
    
    if dry_run:
        console.print(f"[yellow]DRY RUN: Would upload {filename} and insert into database[/yellow]")
        return True
    
    # Upload to storage
    console.print(f"[cyan]Uploading to storage...[/cyan]")
    audio_url = upload_sound_to_storage(file_path, title)
    
    if not audio_url:
        console.print(f"[red]Failed to upload {filename}[/red]")
        return False
    
    console.print(f"[green]✓ Uploaded: {audio_url}[/green]")
    
    # Insert into database
    console.print(f"[cyan]Inserting into database...[/cyan]")
    success = insert_sound_to_db(title, audio_url, duration, category)
    
    if success:
        console.print(f"[green]✓ Successfully added '{title}'[/green]")
    else:
        console.print(f"[red]Failed to insert '{title}' into database[/red]")
    
    return success


def main():
    parser = argparse.ArgumentParser(description='Upload sounds to Supabase Storage and database')
    parser.add_argument(
        '--folder',
        type=str,
        default='/Users/solomon/Library/CloudStorage/Dropbox-SolGoodMedia/Podcast Production/Sound Library/Archived Sounds/Infinite Nature I - Seamless Nature Loops/Sound Files/MP3',
        help='Path to folder containing MP3 files'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Test run without uploading or inserting into database'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='Skip sounds that already exist in database'
    )
    parser.add_argument(
        '--images',
        type=str,
        default='/Users/solomon/Desktop/Sounds',
        help='Path to folder containing sound images'
    )
    parser.add_argument(
        '--match-images',
        action='store_true',
        help='Match images to sounds and upload them (uses filename matching, OCR as fallback)'
    )
    parser.add_argument(
        '--ensure-all-images',
        action='store_true',
        help='Ensure all sounds have images by matching unmatched sounds with available images'
    )
    
    args = parser.parse_args()
    
    folder_path = Path(args.folder)
    
    if not folder_path.exists():
        console.print(f"[red]Error: Folder '{folder_path}' does not exist[/red]")
        sys.exit(1)
    
    # Check if buckets exist (unless dry run)
    if not args.dry_run:
        console.print(f"[cyan]Checking if storage buckets exist...[/cyan]")
        if not check_bucket_exists():
            console.print(f"[red]❌ Storage bucket '{STORAGE_BUCKET}' not found![/red]")
            console.print(f"\n[yellow]Please create the bucket first:[/yellow]")
            console.print(f"[yellow]1. Go to Supabase Dashboard → Storage[/yellow]")
            console.print(f"[yellow]2. Click 'New Bucket'[/yellow]")
            console.print(f"[yellow]3. Name: {STORAGE_BUCKET}[/yellow]")
            console.print(f"[yellow]4. Make it PUBLIC (toggle 'Public bucket')[/yellow]")
            console.print(f"[yellow]5. Click 'Create bucket'[/yellow]")
            console.print(f"\n[yellow]Then run this script again.[/yellow]")
            sys.exit(1)
        console.print(f"[green]✓ Bucket '{STORAGE_BUCKET}' exists[/green]")
        
        # Check image bucket if matching images
        if args.match_images:
            # Try to check if image bucket exists (create if needed)
            try:
                buckets = sb.storage.list_buckets()
                bucket_names = [b.name for b in buckets]
                if IMAGE_BUCKET not in bucket_names:
                    console.print(f"[yellow]Image bucket '{IMAGE_BUCKET}' not found. It will be created if needed.[/yellow]")
            except:
                pass
        console.print()
    
    # Find all MP3 files
    mp3_files = list(folder_path.glob('*.mp3'))
    
    if not mp3_files:
        console.print(f"[yellow]No MP3 files found in '{folder_path}'[/yellow]")
        sys.exit(0)
    
    console.print(f"[green]Found {len(mp3_files)} MP3 files[/green]")
    
    if args.dry_run:
        console.print("[yellow]DRY RUN MODE - No files will be uploaded or inserted[/yellow]")
    
    # Process each file
    success_count = 0
    fail_count = 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console
    ) as progress:
        task = progress.add_task("Processing sounds...", total=len(mp3_files))
        
        for mp3_file in sorted(mp3_files):
            try:
                if process_sound_file(str(mp3_file), dry_run=args.dry_run):
                    success_count += 1
                else:
                    fail_count += 1
            except KeyboardInterrupt:
                console.print(f"\n[yellow]Interrupted by user[/yellow]")
                raise
            except Exception as e:
                error_str = str(e).lower()
                # If bucket error, stop processing
                if "bucket" in error_str and ("not found" in error_str or "does not exist" in error_str):
                    console.print(f"\n[red]Stopping: Bucket issue detected[/red]")
                    break
                console.print(f"[red]Error processing {mp3_file}: {e}[/red]")
                fail_count += 1
            
            progress.update(task, advance=1)
    
    # Summary
    console.print(f"\n[green]✓ Successfully processed: {success_count}[/green]")
    if fail_count > 0:
        console.print(f"[red]✗ Failed: {fail_count}[/red]")
    
    # Match and upload images if requested
    if args.match_images and not args.dry_run and success_count > 0:
        console.print(f"\n[cyan]Matching images to sounds...[/cyan]")
        
        # Get all sound titles from database
        try:
            sounds_result = sb.table('sounds').select('title').execute()
            sound_titles = [s['title'] for s in sounds_result.data]
        except Exception as e:
            console.print(f"[red]Error fetching sound titles: {e}[/red]")
            sound_titles = []
        
        if sound_titles:
            # Match images to sounds (try filename first, OCR as fallback if --match-images is used)
            image_matches = match_images_to_sounds(args.images, sound_titles, use_ocr=args.match_images)
            
            if image_matches:
                console.print(f"\n[cyan]Uploading {len(image_matches)} matched images...[/cyan]")
                
                # Upload images and update database
                uploaded_count = 0
                for sound_title, image_path in image_matches.items():
                    image_url = upload_image_to_storage(image_path, sound_title)
                    if image_url:
                        if update_sound_image(sound_title, image_url):
                            console.print(f"[green]✓ Uploaded image for: {sound_title}[/green]")
                            uploaded_count += 1
                        else:
                            console.print(f"[yellow]⚠ Image uploaded but failed to update database for: {sound_title}[/yellow]")
                    else:
                        console.print(f"[red]✗ Failed to upload image for: {sound_title}[/red]")
                
                console.print(f"\n[green]✓ Uploaded {uploaded_count} images[/green]")
            else:
                console.print(f"[yellow]No images matched to sounds[/yellow]")
    
    # Ensure all sounds have images
    if args.ensure_all_images and not args.dry_run:
        console.print(f"\n[cyan]Ensuring all sounds have images...[/cyan]")
        
        try:
            # Get all sounds without images
            sounds_result = sb.table('sounds').select('id,title,image_url').execute()
            sounds_without_images = [s for s in sounds_result.data if not s.get('image_url')]
            
            if not sounds_without_images:
                console.print(f"[green]✓ All sounds already have images![/green]")
            else:
                console.print(f"[yellow]Found {len(sounds_without_images)} sounds without images[/yellow]")
                
                # Get all sound titles that need images
                sound_titles_needing_images = [s['title'] for s in sounds_without_images]
                
                # Match images to sounds (try filename first, OCR as fallback)
                image_matches = match_images_to_sounds(args.images, sound_titles_needing_images, use_ocr=True)
                
                if image_matches:
                    console.print(f"\n[cyan]Uploading {len(image_matches)} matched images...[/cyan]")
                    
                    # Upload images and update database
                    uploaded_count = 0
                    for sound_title, image_path in image_matches.items():
                        image_url = upload_image_to_storage(image_path, sound_title)
                        if image_url:
                            if update_sound_image(sound_title, image_url):
                                console.print(f"[green]✓ Uploaded image for: {sound_title}[/green]")
                                uploaded_count += 1
                            else:
                                console.print(f"[yellow]⚠ Image uploaded but failed to update database for: {sound_title}[/yellow]")
                        else:
                            console.print(f"[red]✗ Failed to upload image for: {sound_title}[/red]")
                    
                    console.print(f"\n[green]✓ Uploaded {uploaded_count} images for sounds that were missing them[/green]")
                    
                    # Report any sounds that still don't have images
                    remaining = len(sounds_without_images) - uploaded_count
                    if remaining > 0:
                        console.print(f"[yellow]⚠ {remaining} sounds still don't have images. Check image filenames match sound titles.[/yellow]")
                else:
                    console.print(f"[yellow]No images could be matched to the sounds without images[/yellow]")
        except Exception as e:
            console.print(f"[red]Error ensuring all sounds have images: {e}[/red]")
    
    if args.dry_run:
        console.print("\n[yellow]This was a dry run. Run without --dry-run to actually upload files.[/yellow]")


if __name__ == '__main__':
    main()

