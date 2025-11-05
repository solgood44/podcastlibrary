#!/usr/bin/env python3
"""
Enhance podcast descriptions using OpenAI ChatGPT API for better SEO.

This script:
1. Fetches all podcasts from Supabase
2. Enhances descriptions using ChatGPT API to be more SEO-friendly and longer
3. Updates Supabase with the enhanced descriptions
4. Includes rate limiting and error handling

Usage:
    python3 enhance_descriptions.py [--dry-run] [--limit N] [--skip-empty] [--skip-enhanced]

Options:
    --dry-run: Preview changes without updating Supabase
    --limit N: Only process first N podcasts (for testing)
    --skip-empty: Skip podcasts with empty descriptions
    --skip-enhanced: Skip podcasts that appear to already be enhanced
"""

import os
import time
import argparse
from typing import Optional
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn
from rich.panel import Panel
from rich.text import Text

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


def enhance_description(original_description: str, podcast_title: str, author: Optional[str] = None) -> str:
    """
    Enhance a podcast description using ChatGPT API.
    
    Args:
        original_description: The current description
        podcast_title: The podcast title for context
        author: Optional author name
    
    Returns:
        Enhanced description
    """
    # Build context
    context = f"Podcast: {podcast_title}"
    if author:
        context += f" by {author}"
    
    # Determine podcast type based on title and description
    title_lower = podcast_title.lower()
    desc_lower = (original_description or "").lower()
    
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
    
    # Adjust prompt based on whether description exists or needs to be created
    if not original_description or len(original_description.strip()) < 50:
        # Create from scratch based on title
        prompt = f"""Create an engaging, SEO-optimized podcast description (150-250 words) based on the podcast title.

Podcast Title: {podcast_title}
{f'Author: {author}' if author else ''}
Type: {type_note}

Requirements for SEO and listener appeal:
1. **SEO Optimization:**
   - Include natural keywords people would search for (e.g., "audiobook", "free podcast", "{podcast_title.lower()}", "{author.lower() if author else 'classic stories'}")
   - Use phrases like "listen to", "free audio", "full audiobook", "complete story"
   - Include genre keywords naturally
   - Write for Google's search algorithm while maintaining readability

2. **Listener Appeal:**
   - Create desire and excitement about listening
   - Highlight what makes this podcast special or valuable
   - Use compelling language that makes people want to press play
   - Emphasize benefits: relaxation, entertainment, education, storytelling
   - Mention the experience: "immersive", "captivating", "soothing", "engaging"

3. **Content:**
   - If it's an audiobook: mention it's a complete, unabridged version, perfect for listening
   - If it's sleep content: emphasize relaxation, peaceful experience, perfect for bedtime
   - If it's public domain: mention it's a classic, timeless work, free to enjoy
   - Make it clear what listeners will experience

4. **Format:**
   - Engaging opening sentence that hooks the reader
   - Descriptive middle paragraphs
   - Call-to-action encouraging them to listen
   - Natural, conversational tone
   - 150-250 words total
   - NO markdown formatting (no **, no *, no bold text)
   - Do NOT include "Podcast Title:" or "Author:" prefixes - just write naturally
   - Do NOT repeat the podcast title or author name multiple times

Create a compelling description that makes people want to listen (plain text only, no markdown):"""
    else:
        # Enhance existing description
        prompt = f"""Rewrite and enhance this podcast description to be highly SEO-friendly, more engaging, and optimized to increase listener desire. 
Make it 150-250 words while preserving the core content.

Podcast Title: {podcast_title}
{f'Author: {author}' if author else ''}
Type: {type_note}

Original description:
{original_description}

Requirements for SEO and listener appeal:
1. **SEO Optimization for Google:**
   - Include natural keywords people search for (e.g., "audiobook", "free podcast", "{podcast_title.lower()}", "{author.lower() if author else ''}")
   - Use search-friendly phrases: "listen to", "free audio", "full audiobook", "complete story", "download podcast"
   - Include genre and topic keywords naturally throughout
   - Structure for Google's algorithm while maintaining readability
   - Make it discoverable through relevant searches

2. **Increase Listener Desire:**
   - Make it more compelling and exciting
   - Use power words that create urgency and interest
   - Highlight unique benefits and value proposition
   - Emphasize the listening experience: "immersive", "captivating", "soothing", "engaging", "enthralling"
   - Create FOMO: "don't miss", "must-listen", "essential listening"
   - Make listeners feel they'll be missing out if they don't listen

3. **Content Enhancement:**
   - Expand on key points that make it valuable
   - Add context about what makes it special
   - Include benefits: relaxation, entertainment, education, storytelling
   - Make the value proposition clear

4. **Format:**
   - Engaging opening that hooks immediately
   - Rich, descriptive content
   - Strong call-to-action to listen
   - Natural, conversational tone that flows well
   - 150-250 words total
   - NO markdown formatting (no **, no *, no bold text)
   - Do NOT include "Podcast Title:" or "Author:" prefixes - just write naturally
   - Do NOT repeat the podcast title or author name multiple times

Enhanced SEO-optimized description that maximizes listener appeal (plain text only, no markdown):"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Using mini for cost efficiency, can change to "gpt-4" for better quality
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert SEO copywriter specializing in podcast descriptions. Your descriptions are optimized for Google search rankings while being highly compelling to potential listeners. You understand that podcasts are typically audiobooks, public domain works, original stories, or sleep/relaxation content. You create descriptions that maximize both discoverability and listener desire to press play."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=800  # Increased to ensure full descriptions (500 was cutting off some)
        )
        
        enhanced = response.choices[0].message.content.strip()
        
        # Clean up common issues: remove markdown formatting and title/author prefixes
        enhanced = cleanup_description(enhanced, podcast_title, author)
        
        return enhanced
        
    except Exception as e:
        console.print(f"[red]Error calling OpenAI API: {e}[/red]")
        raise


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


def update_podcast_description(podcast_id: str, enhanced_description: str):
    """Update podcast description in Supabase."""
    try:
        result = sb.table("podcasts").update({
            "description": enhanced_description
        }).eq("id", podcast_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        console.print(f"[red]Error updating podcast: {e}[/red]")
        raise


def is_likely_enhanced(description: str) -> bool:
    """
    Check if a description is likely already enhanced (AI-generated).
    Criteria: longer than 100 chars and contains SEO-friendly phrases.
    """
    if not description or len(description) < 100:
        return False
    
    desc_lower = description.lower()
    # Check for common SEO phrases we inject
    seo_phrases = [
        "listen to",
        "free audio",
        "full audiobook",
        "complete story",
        "must-listen",
        "essential listening",
        "immersive",
        "captivating",
    ]
    
    # If it has 2+ SEO phrases, likely enhanced
    phrase_count = sum(1 for phrase in seo_phrases if phrase in desc_lower)
    return phrase_count >= 2


def main():
    parser = argparse.ArgumentParser(description="Enhance podcast descriptions using ChatGPT")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without updating")
    parser.add_argument("--limit", type=int, help="Only process first N podcasts")
    parser.add_argument("--skip-empty", action="store_true", help="Skip podcasts with empty descriptions")
    parser.add_argument("--skip-enhanced", action="store_true", help="Skip podcasts that appear to already be enhanced")
    args = parser.parse_args()
    
    console.print(Panel.fit(
        "[bold cyan]Podcast Description Enhancer[/bold cyan]\n"
        "Using OpenAI ChatGPT API to create SEO-friendly descriptions",
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
    
    # Apply filters
    if args.skip_empty:
        podcasts = [p for p in podcasts if p.get("description") and p.get("description").strip()]
    
    if args.skip_enhanced:
        original_count = len(podcasts)
        podcasts = [p for p in podcasts if not is_likely_enhanced(p.get("description", ""))]
        skipped_enhanced = original_count - len(podcasts)
        if skipped_enhanced > 0:
            console.print(f"[yellow]Skipping {skipped_enhanced} podcast(s) that appear already enhanced[/yellow]")
    
    if args.limit:
        podcasts = podcasts[:args.limit]
    
    total = len(podcasts)
    console.print(f"[green]Found {total} podcast(s) to process[/green]\n")
    
    if total == 0:
        console.print("[yellow]No podcasts to process after filtering[/yellow]")
        return
    
    # Process podcasts
    updated = 0
    skipped = 0
    errors = 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Processing podcasts...", total=total)
        
        for i, podcast in enumerate(podcasts):
            podcast_id = podcast.get("id")
            title = podcast.get("title", "Unknown")
            author = podcast.get("author")
            original_description = podcast.get("description", "").strip()
            
            # Skip if empty and not skipping empty
            if not original_description and not args.skip_empty:
                progress.update(task, description=f"[yellow]Skipping {title[:50]}... (empty description)")
                skipped += 1
                progress.advance(task)
                continue
            
            progress.update(task, description=f"[cyan]Processing: {title[:50]}...")
            
            try:
                # Enhance description
                if original_description:
                    enhanced = enhance_description(original_description, title, author)
                else:
                    # For empty descriptions, create one from scratch
                    enhanced = enhance_description(
                        f"This is a podcast called {title}" + (f" by {author}" if author else ""),
                        title,
                        author
                    )
                
                # Show preview
                if i == 0 or args.dry_run:  # Show first one and all in dry-run
                    console.print(f"\n[bold]Podcast:[/bold] {title}")
                    if original_description:
                        console.print(f"[dim]Original ({len(original_description)} chars):[/dim] {original_description[:100]}...")
                    else:
                        console.print("[dim]Original: (empty)[/dim]")
                    console.print(f"[green]Enhanced ({len(enhanced)} chars):[/green] {enhanced[:200]}...")
                    console.print()
                
                # Update Supabase (unless dry-run)
                if not args.dry_run:
                    update_podcast_description(podcast_id, enhanced)
                    updated += 1
                    progress.update(task, description=f"[green]✓ Updated: {title[:50]}...")
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
        f"Total podcasts: {total}\n"
        f"[green]Updated: {updated}[/green]\n"
        f"[yellow]Skipped: {skipped}[/yellow]\n"
        f"[red]Errors: {errors}[/red]",
        border_style="cyan"
    ))
    
    if args.dry_run:
        console.print("\n[yellow]This was a dry run. No changes were saved.[/yellow]")
        console.print("[yellow]Run without --dry-run to apply changes.[/yellow]")


if __name__ == "__main__":
    main()

