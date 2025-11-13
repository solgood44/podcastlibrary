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
from typing import Optional, Dict
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
import mutagen
from mutagen.mp3 import MP3

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
console = Console()

STORAGE_BUCKET = "sounds"  # You'll need to create this bucket in Supabase


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


def insert_sound_to_db(title: str, audio_url: str, duration_seconds: Optional[int], category: str) -> bool:
    """Insert sound record into database."""
    try:
        result = sb.table('sounds').insert({
            'title': title,
            'audio_url': audio_url,
            'duration_seconds': duration_seconds,
            'category': category,
            'is_premium': False  # Set to True later for premium sounds
        }).execute()
        
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
    
    args = parser.parse_args()
    
    folder_path = Path(args.folder)
    
    if not folder_path.exists():
        console.print(f"[red]Error: Folder '{folder_path}' does not exist[/red]")
        sys.exit(1)
    
    # Check if bucket exists (unless dry run)
    if not args.dry_run:
        console.print(f"[cyan]Checking if storage bucket '{STORAGE_BUCKET}' exists...[/cyan]")
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
        console.print(f"[green]✓ Bucket '{STORAGE_BUCKET}' exists[/green]\n")
    
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
    
    if args.dry_run:
        console.print("\n[yellow]This was a dry run. Run without --dry-run to actually upload files.[/yellow]")


if __name__ == '__main__':
    main()

