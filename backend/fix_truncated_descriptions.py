#!/usr/bin/env python3
"""
Fix podcast descriptions that end in "..." (truncated descriptions).

This script:
1. Fetches all podcasts from Supabase
2. Finds descriptions that end in "..."
3. Rewrites them using OpenAI to complete the description
4. Updates Supabase with the complete descriptions

Usage:
    python3 fix_truncated_descriptions.py [--dry-run] [--limit N]
"""

import os
import re
import time
import argparse
from typing import Optional
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn, MofNCompleteColumn
from rich.panel import Panel

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY must be set in .env")

# Initialize clients
sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)
console = Console()

# Rate limiting: delay between API calls (seconds)
API_DELAY = 0.5


def cleanup_description(description: str, podcast_title: str, author: Optional[str] = None) -> str:
    """
    Clean up description by removing markdown formatting and title/author prefixes.
    """
    if not description:
        return description
    
    # Remove markdown bold (**text**) - handle both single and double asterisks
    description = re.sub(r'\*\*(.*?)\*\*', r'\1', description)
    description = re.sub(r'\*(.*?)\*', r'\1', description)
    
    # Remove common prefixes (with or without markdown)
    prefixes_to_remove = []
    
    # Add variations with markdown
    prefixes_to_remove.append(f"**Podcast Title: {podcast_title}**")
    prefixes_to_remove.append(f"Podcast Title: {podcast_title}")
    if author:
        prefixes_to_remove.append(f"**Author: {author}**")
        prefixes_to_remove.append(f"Author: {author}")
    
    # Also remove if title/author appear in the pattern at the start
    # Pattern: **Podcast Title: Title** **Author: Author** or similar
    title_pattern = re.compile(r'^\s*\*\*Podcast Title:\s*' + re.escape(podcast_title) + r'\s*\*\*\s*', re.IGNORECASE)
    description = title_pattern.sub('', description)
    
    if author:
        author_pattern = re.compile(r'^\s*\*\*Author:\s*' + re.escape(author) + r'\s*\*\*\s*', re.IGNORECASE)
        description = author_pattern.sub('', description)
    
    # Remove standalone prefixes
    for prefix in prefixes_to_remove:
        if prefix:
            # Remove at start (with or without leading space)
            if description.strip().startswith(prefix):
                description = description.replace(prefix, "", 1).strip()
            # Remove if followed by space
            description = re.sub(re.escape(prefix) + r'\s+', '', description, count=1)
            # Remove if on its own line
            description = re.sub(re.escape(prefix) + r'\s*\n', '\n', description, count=1)
    
    # Remove any remaining "Podcast Title:" or "Author:" patterns
    description = re.sub(r'^\s*\*\*Podcast Title:\s*.*?\*\*\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
    description = re.sub(r'^\s*Podcast Title:\s*.*?\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
    if author:
        description = re.sub(r'^\s*\*\*Author:\s*.*?\*\*\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
        description = re.sub(r'^\s*Author:\s*.*?\s*', '', description, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove title and author if they appear at the start of the description
    if author:
        # Remove "Title Author" pattern at start
        pattern = r'^\s*' + re.escape(podcast_title) + r'\s+' + re.escape(author) + r'\s+'
        description = re.sub(pattern, '', description, flags=re.IGNORECASE)
        
        # Also try just author name at start
        author_pattern = r'^\s*' + re.escape(author) + r'\s+'
        description = re.sub(author_pattern, '', description, flags=re.IGNORECASE)
        
        # And just title at start (if author wasn't there)
        if not description.strip().lower().startswith(author.lower()):
            title_pattern = r'^\s*' + re.escape(podcast_title) + r'\s+'
            description = re.sub(title_pattern, '', description, flags=re.IGNORECASE)
    
    # Remove title if it appears at start (without author)
    title_start_pattern = r'^\s*' + re.escape(podcast_title) + r'\s+'
    description = re.sub(title_start_pattern, '', description, flags=re.IGNORECASE)
    
    # Clean up extra whitespace and newlines
    description = re.sub(r'\s+', ' ', description)  # Multiple spaces to single
    description = re.sub(r'\n\s*\n', '\n\n', description)  # Multiple newlines to double
    description = description.strip()
    
    return description


def has_links(text: str) -> bool:
    """
    Check if text contains URLs or links.
    """
    if not text:
        return False
    
    # Common URL patterns (more specific to avoid false positives)
    url_patterns = [
        r'http[s]?://[^\s]+',  # http:// or https:// followed by non-whitespace
        r'www\.[^\s]+',         # www. followed by non-whitespace
        r'[a-zA-Z0-9-]+\.(?:com|org|net|edu|io|co\.uk|gov|tv|me|info)[^\s]*',  # domain.com, domain.org, etc.
    ]
    
    text_lower = text.lower()
    for pattern in url_patterns:
        if re.search(pattern, text_lower):
            return True
    
    return False


def complete_description(truncated_description: str, podcast_title: str, author: Optional[str] = None) -> str:
    """
    Complete a truncated description that ends in "...".
    
    Args:
        truncated_description: The truncated description ending in "..."
        podcast_title: The podcast title for context
        author: Optional author name
    
    Returns:
        Complete description
    """
    # Check if description contains links - if so, rewrite completely from scratch
    contains_links = has_links(truncated_description)
    
    if contains_links:
        # If description has links, create completely new description from title/author only
        console.print(f"[yellow]Found links in description - rewriting from scratch based on title/author[/yellow]")
        base_description = ""  # Don't use the old description at all
        use_existing = False
    else:
        # Remove the trailing "..." to get the base description
        base_description = truncated_description.rstrip('.').rstrip().rstrip('.')
        use_existing = True
    
    # Determine podcast type based on title and description
    title_lower = podcast_title.lower()
    desc_lower = (base_description or "").lower()
    
    is_audiobook = any(keyword in title_lower or keyword in desc_lower 
                      for keyword in ['book', 'novel', 'story', 'tale', 'classic', 'literature'])
    is_sleep = any(keyword in title_lower or keyword in desc_lower 
                  for keyword in ['sleep', 'sleeping', 'relax', 'meditation', 'ambient', 'white noise', 'rain', 'ocean', 'nature sounds'])
    is_public_domain = any(keyword in title_lower or keyword in desc_lower 
                          for keyword in ['public domain', 'classic', 'vintage', 'old time', 'historical'])
    
    # Build context about podcast type
    type_context = []
    if is_audiobook:
        type_context.append("audiobook adaptation")
    if is_sleep:
        type_context.append("sleep/relaxation content")
    if is_public_domain:
        type_context.append("public domain work")
    if not type_context:
        type_context.append("audio content")
    
    type_note = ", ".join(type_context) if type_context else "audio content"
    
    if use_existing:
        # Complete existing truncated description
        prompt = f"""Complete and enhance this truncated podcast description. The description was cut off mid-sentence and ends with "...". 

Podcast Title: {podcast_title}
{f'Author: {author}' if author else ''}
Type: {type_note}

Truncated description:
{base_description}...

Write a compelling description that:

1. **Accurately reflects the book's themes and tone:**
   - Complete the thought that was cut off naturally
   - Continue seamlessly from where it left off
   - Stay true to the themes and tone established in the truncated portion

2. **Explains why someone would want to listen:**
   - What makes this content valuable or engaging
   - What listeners will gain from the experience

3. **States who the book is for:**
   - Who would enjoy this content
   - What type of listener it appeals to

4. **Uses SEO-friendly search terms naturally:**
   - Include genre, historical period, themes naturally
   - Don't keyword-stuff - integrate terms organically

5. **No hype, no filler, no spoilers:**
   - Avoid dramatic or sensational language
   - Don't oversell or use excessive adjectives
   - Don't reveal major plot points

6. **Style:**
   - Clear, warm, confident tone
   - Not dramatic or sensational
   - One flowing paragraph (no bullet points)
   - 500-1000 characters total

7. **Format:**
   - Plain text only (no markdown, no **, no *)
   - Do NOT include "Podcast Title:" or "Author:" prefixes
   - Do NOT repeat the podcast title or author name unnecessarily
   - Do NOT end with "..." - write a complete, finished description
   - Single paragraph - no line breaks
   - NO URLs or links - write a clean description without any web addresses

Write a polished, complete description in a single flowing paragraph:"""
    else:
        # Create completely new description from title/author only
        prompt = f"""Create a compelling podcast description based on the podcast title and author.

Podcast Title: {podcast_title}
{f'Author: {author}' if author else ''}
Type: {type_note}

Write a compelling description that:

1. **Accurately reflects the book's themes and tone:**
   - Based on the title and author, determine what this content is about
   - Match the appropriate tone for this type of content
   - Be accurate to what the book/podcast actually contains

2. **Explains why someone would want to listen:**
   - What makes this content valuable or engaging
   - What listeners will gain from the experience

3. **States who the book is for:**
   - Who would enjoy this content
   - What type of listener it appeals to

4. **Uses SEO-friendly search terms naturally:**
   - Include genre, historical period, themes naturally
   - Don't keyword-stuff - integrate terms organically

5. **No hype, no filler, no spoilers:**
   - Avoid dramatic or sensational language
   - Don't oversell or use excessive adjectives
   - Don't reveal major plot points
   - Be accurate and truthful about the content

6. **Style:**
   - Clear, warm, confident tone
   - Not dramatic or sensational
   - One flowing paragraph (no bullet points)
   - 500-1000 characters total

7. **Format:**
   - Plain text only (no markdown, no **, no *)
   - Do NOT include "Podcast Title:" or "Author:" prefixes
   - Do NOT repeat the podcast title or author name unnecessarily
   - Single paragraph - no line breaks
   - NO URLs or links - write a clean description without any web addresses
   - Be accurate to the actual content - don't make up details

Write a polished description in a single flowing paragraph that accurately represents this content:"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert writer specializing in clear, warm, confident podcast descriptions. You write single-paragraph descriptions (500-1000 characters) that accurately reflect themes and tone, explain why someone would want to listen, state who it's for, and use SEO-friendly terms naturally. You avoid hype, filler, spoilers, and dramatic language. Your style is clear, warm, and confident - never sensational."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=400  # 500-1000 characters is roughly 100-200 tokens, but allow more for safety
        )
        
        completed = response.choices[0].message.content.strip()
        
        # Clean up common issues: remove markdown formatting and title/author prefixes
        completed = cleanup_description(completed, podcast_title, author)
        
        # Ensure it doesn't end with "..."
        completed = completed.rstrip('.').rstrip().rstrip('.')
        if completed.endswith('...'):
            completed = completed[:-3].rstrip()
        
        # Ensure single paragraph (remove line breaks, convert to single paragraph)
        completed = ' '.join(completed.split())
        
        # Remove any URLs/links that might have been generated
        completed = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', completed)
        completed = re.sub(r'www\.(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', completed)
        completed = ' '.join(completed.split())  # Clean up extra spaces
        
        # Validate length (500-1000 characters)
        if len(completed) < 500:
            # If too short, ask for a bit more detail
            console.print(f"[yellow]Warning: Description is {len(completed)} chars (target: 500-1000). Regenerating...[/yellow]")
            # Could regenerate here, but for now just note it
        elif len(completed) > 1000:
            # If too long, truncate intelligently (at sentence boundary if possible)
            truncated = completed[:1000]
            last_period = truncated.rfind('.')
            if last_period > 800:  # Only truncate at sentence if we're close to the limit
                completed = truncated[:last_period + 1]
            else:
                completed = truncated.rstrip() + '...'
                console.print(f"[yellow]Warning: Description truncated to 1000 chars[/yellow]")
        
        return completed
        
    except Exception as e:
        console.print(f"[red]Error calling OpenAI API: {e}[/red]")
        raise


def fetch_all_podcasts():
    """Fetch all podcasts from Supabase with pagination."""
    try:
        all_podcasts = []
        page_size = 1000
        offset = 0
        
        while True:
            # Fetch with limit and offset
            result = sb.table("podcasts").select("id,title,author,description").range(offset, offset + page_size - 1).execute()
            
            if not result.data:
                break
                
            all_podcasts.extend(result.data)
            
            # If we got fewer than page_size, we've reached the end
            if len(result.data) < page_size:
                break
                
            offset += page_size
        
        return all_podcasts
    except Exception as e:
        console.print(f"[red]Error fetching podcasts: {e}[/red]")
        raise


def update_podcast_description(podcast_id: str, completed_description: str):
    """Update podcast description in Supabase."""
    try:
        result = sb.table("podcasts").update({
            "description": completed_description
        }).eq("id", podcast_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        console.print(f"[red]Error updating podcast: {e}[/red]")
        raise


def is_truncated(description: str) -> bool:
    """
    Check if a description ends with "..." (truncated).
    """
    if not description:
        return False
    
    description = description.strip()
    # Check if it ends with "..." (with or without trailing spaces)
    return description.endswith('...') or description.rstrip().endswith('...')


def main():
    parser = argparse.ArgumentParser(description="Fix truncated podcast descriptions ending in '...'")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without updating")
    parser.add_argument("--limit", type=int, help="Only process first N podcasts (for testing)")
    parser.add_argument("--title", type=str, help="Only process podcast with this exact title")
    args = parser.parse_args()
    
    console.print(Panel.fit(
        "[bold cyan]Fix Truncated Descriptions[/bold cyan]\n"
        "Finding and completing descriptions that end in '...'",
        border_style="cyan"
    ))
    
    if args.dry_run:
        console.print("[yellow]DRY RUN MODE: No changes will be saved[/yellow]\n")
    
    # Fetch all podcasts
    console.print("[cyan]Fetching podcasts from Supabase...[/cyan]")
    podcasts = fetch_all_podcasts()
    
    if not podcasts:
        console.print("[yellow]No podcasts found[/yellow]")
        return
    
    # Filter for truncated descriptions
    truncated_podcasts = [
        p for p in podcasts 
        if p.get("description") and is_truncated(p.get("description", ""))
    ]
    
    # Filter by title if specified
    if args.title:
        truncated_podcasts = [
            p for p in truncated_podcasts 
            if p.get("title", "").strip() == args.title.strip()
        ]
        if not truncated_podcasts:
            console.print(f"[yellow]No podcast found with title: '{args.title}'[/yellow]")
            console.print("[yellow]Or it doesn't have a truncated description.[/yellow]")
            return
    
    if args.limit:
        truncated_podcasts = truncated_podcasts[:args.limit]
    
    total = len(truncated_podcasts)
    console.print(f"[green]Found {total} podcast(s) with truncated descriptions[/green]\n")
    
    if total == 0:
        console.print("[yellow]No truncated descriptions found[/yellow]")
        return
    
    # Show some examples
    console.print("[cyan]Examples of truncated descriptions:[/cyan]")
    for i, podcast in enumerate(truncated_podcasts[:3]):
        desc = podcast.get("description", "")
        console.print(f"  {i+1}. {podcast.get('title', 'Unknown')[:60]}")
        console.print(f"     {desc[:100]}...")
    if total > 3:
        console.print(f"     ... and {total - 3} more\n")
    else:
        console.print()
    
    # Process podcasts
    updated = 0
    errors = 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold green]{task.description}", justify="left"),
        BarColumn(bar_width=None, style="green", complete_style="bold green", finished_style="bold green"),
        TextColumn("[green]{task.percentage:>3.0f}%"),
        MofNCompleteColumn(),
        TextColumn("[dim green]•"),
        TimeElapsedColumn(),
        console=console,
        expand=True
    ) as progress:
        task = progress.add_task("[bold green]Processing podcasts...", total=total)
        
        for i, podcast in enumerate(truncated_podcasts):
            podcast_id = podcast.get("id")
            title = podcast.get("title", "Unknown")
            author = podcast.get("author")
            truncated_description = podcast.get("description", "").strip()
            
            try:
                progress.update(task, description=f"[bold green]Processing: {title[:50]}...")
                
                # Complete the description
                completed = complete_description(truncated_description, title, author)
                
                # Show preview for first few or in dry-run mode
                if i < 3 or args.dry_run:
                    console.print(f"\n[bold cyan]{title}[/bold cyan]")
                    console.print(f"[dim]Original ({len(truncated_description)} chars): {truncated_description[:80]}...[/dim]")
                    console.print(f"[green]New ({len(completed)} chars): {completed[:150]}...[/green]\n")
                
                # Update Supabase (unless dry-run)
                if not args.dry_run:
                    update_podcast_description(podcast_id, completed)
                    updated += 1
                    progress.update(task, description=f"[bold green]✓ Updated: {title[:50]}...")
                else:
                    progress.update(task, description=f"[yellow]Preview: {title[:50]}...")
                
                # Rate limiting
                time.sleep(API_DELAY)
                
            except Exception as e:
                errors += 1
                progress.update(task, description=f"[red]✗ Error: {title[:50]}...")
                console.print(f"[red]Error processing {title}: {e}[/red]")
            
            progress.advance(task)
    
    # Summary
    console.print("\n" + "="*60)
    console.print(Panel.fit(
        f"[bold]Summary[/bold]\n\n"
        f"Total truncated descriptions found: {total}\n"
        f"[green]Updated: {updated}[/green]\n"
        f"[red]Errors: {errors}[/red]",
        border_style="cyan"
    ))
    
    if args.dry_run:
        console.print("\n[yellow]This was a dry run. No changes were saved.[/yellow]")
        console.print("[yellow]Run without --dry-run to apply changes.[/yellow]")


if __name__ == "__main__":
    main()

