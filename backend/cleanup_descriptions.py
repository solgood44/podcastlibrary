#!/usr/bin/env python3
"""
Clean up existing podcast descriptions by removing markdown formatting and title/author prefixes.

This script fixes descriptions that were already enhanced but have markdown formatting issues.
"""

import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.panel import Panel

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
console = Console()


def cleanup_description(description: str, podcast_title: str, author: str = None) -> str:
    """
    Clean up description by removing markdown formatting, title, and author names.
    """
    if not description:
        return description
    
    # Remove markdown bold (**text**)
    description = re.sub(r'\*\*(.*?)\*\*', r'\1', description)
    description = re.sub(r'\*(.*?)\*', r'\1', description)
    
    # Remove "Podcast Title:" and "Author:" prefixes (with or without markdown)
    title_pattern = re.compile(r'^\s*\*\*Podcast Title:\s*' + re.escape(podcast_title) + r'\s*\*\*\s*', re.IGNORECASE)
    description = title_pattern.sub('', description)
    
    if author:
        author_pattern = re.compile(r'^\s*\*\*Author:\s*' + re.escape(author) + r'\s*\*\*\s*', re.IGNORECASE)
        description = author_pattern.sub('', description)
    
    # Remove any remaining "Podcast Title:" or "Author:" patterns
    description = re.sub(r'^\s*\*\*Podcast Title:\s*.*?\*\*\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
    description = re.sub(r'^\s*Podcast Title:\s*.*?\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
    if author:
        description = re.sub(r'^\s*\*\*Author:\s*.*?\*\*\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
        description = re.sub(r'^\s*Author:\s*.*?\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove standalone prefixes
    prefixes_to_remove = [
        f"**Podcast Title: {podcast_title}**",
        f"Podcast Title: {podcast_title}",
    ]
    if author:
        prefixes_to_remove.extend([
            f"**Author: {author}**",
            f"Author: {author}",
        ])
    
    for prefix in prefixes_to_remove:
        if description.strip().startswith(prefix):
            description = description.replace(prefix, "", 1).strip()
        description = re.sub(re.escape(prefix) + r'\s+', '', description, count=1)
    
    # NEW: Remove title and author if they appear at the start of the description
    # Pattern: "Title Author" or "Title  Author" at the beginning
    if author:
        # Remove "Title Author" pattern at start
        pattern = r'^\s*' + re.escape(podcast_title) + r'\s+' + re.escape(author) + r'\s+'
        description = re.sub(pattern, '', description, flags=re.IGNORECASE)
        
        # Also try just author name at start
        author_pattern = r'^\s*' + re.escape(author) + r'\s+'
        description = re.sub(author_pattern, '', description, flags=re.IGNORECASE)
        
        # And just title at start (if author wasn't there)
        if not description.strip().startswith(author):
            title_pattern = r'^\s*' + re.escape(podcast_title) + r'\s+'
            description = re.sub(title_pattern, '', description, flags=re.IGNORECASE)
    
    # Remove title if it appears at start (without author)
    title_start_pattern = r'^\s*' + re.escape(podcast_title) + r'\s+'
    description = re.sub(title_start_pattern, '', description, flags=re.IGNORECASE)
    
    # Clean up extra whitespace
    description = re.sub(r'\s+', ' ', description)  # Multiple spaces to single
    description = re.sub(r'\n\s*\n', '\n\n', description)  # Multiple newlines to double
    description = description.strip()
    
    return description


def fetch_all_podcasts():
    """Fetch all podcasts from Supabase with pagination."""
    all_podcasts = []
    page_size = 1000
    offset = 0
    
    while True:
        result = sb.table("podcasts").select("id,title,author,description").range(offset, offset + page_size - 1).execute()
        
        if not result.data:
            break
            
        all_podcasts.extend(result.data)
        
        if len(result.data) < page_size:
            break
            
        offset += page_size
    
    return all_podcasts


def update_podcast_description(podcast_id: str, cleaned_description: str):
    """Update podcast description in Supabase."""
    result = sb.table("podcasts").update({
        "description": cleaned_description
    }).eq("id", podcast_id).execute()
    return result.data[0] if result.data else None


def main():
    console.print(Panel.fit(
        "[bold cyan]Description Cleanup Tool[/bold cyan]\n"
        "Removing markdown formatting and title/author prefixes",
        border_style="cyan"
    ))
    
    # Fetch all podcasts
    console.print("[cyan]Fetching podcasts from Supabase...[/cyan]")
    podcasts = fetch_all_podcasts()
    
    if not podcasts:
        console.print("[yellow]No podcasts found[/yellow]")
        return
    
    total = len(podcasts)
    console.print(f"[green]Found {total} podcast(s)[/green]\n")
    
    # Process podcasts
    updated = 0
    unchanged = 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Cleaning descriptions...", total=total)
        
        for podcast in podcasts:
            podcast_id = podcast.get("id")
            title = podcast.get("title", "Unknown")
            author = podcast.get("author")
            original_description = podcast.get("description", "").strip()
            
            if not original_description:
                unchanged += 1
                progress.advance(task)
                continue
            
            progress.update(task, description=f"[cyan]Processing: {title[:50]}...")
            
            # Clean description
            cleaned = cleanup_description(original_description, title, author)
            
            # Check if it changed
            if cleaned != original_description:
                update_podcast_description(podcast_id, cleaned)
                updated += 1
                progress.update(task, description=f"[green]✓ Updated: {title[:50]}...")
            else:
                unchanged += 1
            
            progress.advance(task)
    
    # Summary
    console.print("\n" + "="*60)
    console.print(Panel.fit(
        f"[bold]Summary[/bold]\n\n"
        f"Total podcasts: {total}\n"
        f"[green]Updated: {updated}[/green]\n"
        f"[yellow]Unchanged: {unchanged}[/yellow]",
        border_style="cyan"
    ))


if __name__ == "__main__":
    main()

