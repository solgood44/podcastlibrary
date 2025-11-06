#!/usr/bin/env python3
"""
Generate SEO-friendly author descriptions using OpenAI GPT API.

This script:
1. Fetches all unique authors from podcasts in Supabase
2. Generates SEO-friendly descriptions using GPT API
3. Stores descriptions in the authors table
4. Includes rate limiting and error handling

Usage:
    python3 generate_author_descriptions.py [--dry-run] [--limit N] [--skip-existing]
"""

import os
import time
import argparse
from typing import Optional, List, Dict
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
API_DELAY = 1.0

# Authors to exclude
EXCLUDED_AUTHORS = [
    'solgoodmedia',
    'solgoodmedia.com',
    'sol good network',
    'sol good media',
    'public domain'
]


def generate_author_description(author_name: str, podcasts: List[Dict]) -> str:
    """
    Generate an SEO-friendly author biography using GPT API.
    Treats authors as literary figures/book authors, not podcasters.
    
    Args:
        author_name: The author's name
        podcasts: List of podcast dictionaries (with title, description, genre)
    
    Returns:
        Generated biography
    """
    # Build context about the author's works
    work_titles = [p.get('title', '') for p in podcasts if p.get('title')]
    work_genres = []
    for p in podcasts:
        if p.get('genre'):
            if isinstance(p['genre'], list):
                work_genres.extend(p['genre'])
            else:
                work_genres.append(p['genre'])
    
    unique_genres = list(set([g for g in work_genres if g]))
    
    # Create context string about their works
    context_parts = []
    if work_titles:
        # Format as notable works
        works_list = ', '.join(work_titles[:8])  # Limit to first 8
        if len(work_titles) > 8:
            works_list += f", and {len(work_titles) - 8} more"
        context_parts.append(f"Notable works: {works_list}")
    if unique_genres:
        context_parts.append(f"Primary genres: {', '.join(unique_genres[:5])}")
    
    context = "\n".join(context_parts)
    work_count = len(podcasts)
    
    # Determine if author is likely a classic/public domain author
    is_classic = any(
        keyword in author_name.lower() or 
        any(keyword in title.lower() for title in work_titles[:3])
        for keyword in ['classic', 'vintage', 'public domain', 'literature', '19th', '18th', '20th century']
    )
    
    prompt = f"""Create an engaging, SEO-optimized author biography (200-300 words) for a literary author.

Author Name: {author_name}
Number of published works: {work_count}
{context if context else "Limited information available about their works."}
{"This appears to be a classic or historical author." if is_classic else ""}

Requirements for SEO and readability:
1. **SEO Optimization:**
   - Include natural keywords people search for: "{author_name}", "author biography", "books by {author_name}", "literary works"
   - Include genre keywords naturally (e.g., "fiction", "literature", "classic literature", "novels")
   - Use phrases like "renowned author", "notable writer", "literary figure", "published works"
   - Write for Google's search algorithm while maintaining natural readability
   - Include searchable terms that help readers discover this author

2. **Author Biography Style:**
   - Write as a literary biography, not a podcaster profile
   - Focus on the author as a writer/literary figure
   - Use third person (e.g., "{author_name} is...", "{author_name} has...")
   - Write in a professional, biographical tone suitable for an author profile
   - Treat this as a writer's bio page, like you'd see in a library or bookstore

3. **Content:**
   - Start with who the author is (their significance, background, or literary contributions)
   - Mention their notable works naturally within the biography
   - Include their primary genres or literary style if relevant
   - Highlight their contribution to literature or their writing style
   - Make it informative about the author themselves, not just their content
   - Can mention specific works but focus on the author as a person/writer

4. **Format:**
   - Engaging opening that establishes the author's identity
   - Descriptive middle paragraphs about their work and style
   - Natural integration of keywords throughout
   - 200-300 words total
   - NO markdown formatting (no **, no *, no bold text)
   - Do NOT include "Author Name:" or "Biography:" prefixes
   - Do NOT repeat the author name multiple times unnecessarily
   - Write naturally, as if this is a Wikipedia-style biography entry

Generate a compelling, SEO-optimized author biography that helps readers and search engines understand who {author_name} is as a literary figure."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional biographer and literary content writer specializing in creating SEO-friendly author biographies. Write engaging, informative literary biographies that are optimized for search engines while remaining natural and readable. Treat authors as literary figures and writers, not podcasters. Focus on their contribution to literature and their writing style."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=600
        )
        
        description = response.choices[0].message.content.strip()
        
        # Clean up any markdown that might have been added
        description = description.replace('**', '').replace('*', '').strip()
        
        return description
        
    except Exception as e:
        console.print(f"[red]Error generating description for {author_name}: {e}[/red]")
        raise


def fetch_all_authors() -> List[str]:
    """
    Fetch all unique authors from podcasts, excluding specified ones.
    
    Returns:
        List of author names
    """
    try:
        response = sb.table("podcasts").select("author").execute()
        
        authors_set = set()
        excluded_lower = [a.lower() for a in EXCLUDED_AUTHORS]
        
        for podcast in response.data:
            author = podcast.get('author')
            if author and isinstance(author, str):
                author = author.strip()
                if author and author.lower() not in excluded_lower:
                    authors_set.add(author)
        
        return sorted(list(authors_set))
        
    except Exception as e:
        console.print(f"[red]Error fetching authors: {e}[/red]")
        raise


def fetch_podcasts_by_author(author_name: str) -> List[Dict]:
    """
    Fetch all podcasts by a specific author.
    
    Args:
        author_name: The author's name
    
    Returns:
        List of podcast dictionaries
    """
    try:
        response = sb.table("podcasts").select("id,title,description,genre").eq("author", author_name).execute()
        return response.data
    except Exception as e:
        console.print(f"[red]Error fetching podcasts for {author_name}: {e}[/red]")
        return []


def get_existing_author(author_name: str) -> Optional[Dict]:
    """
    Check if author already exists in the authors table.
    
    Args:
        author_name: The author's name
    
    Returns:
        Author record if exists, None otherwise
    """
    try:
        response = sb.table("authors").select("*").eq("name", author_name).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        console.print(f"[yellow]Warning: Could not check existing author {author_name}: {e}[/yellow]")
        return None


def upsert_author(author_name: str, description: str, dry_run: bool = False):
    """
    Insert or update author description in the database.
    
    Args:
        author_name: The author's name
        description: The generated description
        dry_run: If True, don't actually update the database
    """
    if dry_run:
        console.print(f"[yellow][DRY RUN] Would upsert author: {author_name}[/yellow]")
        return
    
    try:
        data = {
            "name": author_name,
            "description": description
        }
        
        # Use upsert to insert or update
        response = sb.table("authors").upsert(data, on_conflict="name").execute()
        
        if response.data:
            console.print(f"[green]✓[/green] Updated author: {author_name}")
        else:
            console.print(f"[yellow]Warning: No data returned for {author_name}[/yellow]")
            
    except Exception as e:
        console.print(f"[red]Error upserting author {author_name}: {e}[/red]")
        raise


def main():
    parser = argparse.ArgumentParser(description="Generate author descriptions using GPT API")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without updating database")
    parser.add_argument("--limit", type=int, help="Only process first N authors (for testing)")
    parser.add_argument("--skip-existing", action="store_true", help="Skip authors that already have descriptions")
    
    args = parser.parse_args()
    
    console.print(Panel.fit("[bold blue]Author Description Generator[/bold blue]", border_style="blue"))
    
    # Fetch all authors
    console.print("\n[cyan]Fetching authors from database...[/cyan]")
    authors = fetch_all_authors()
    
    if not authors:
        console.print("[yellow]No authors found.[/yellow]")
        return
    
    console.print(f"[green]Found {len(authors)} authors[/green]")
    
    # Apply limit if specified
    if args.limit:
        authors = authors[:args.limit]
        console.print(f"[yellow]Processing first {len(authors)} authors (limit applied)[/yellow]")
    
    # Process each author
    successful = 0
    skipped = 0
    failed = 0
    
    with Progress(
        SpinnerColumn(),
        BarColumn(),
        TextColumn("[progress.description]{task.description}"),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Processing authors...", total=len(authors))
        
        for author_name in authors:
            progress.update(task, description=f"[cyan]Processing: {author_name}...")
            
            try:
                # Check if author already exists and skip if requested
                if args.skip_existing:
                    existing = get_existing_author(author_name)
                    if existing and existing.get('description'):
                        console.print(f"[yellow]Skipping {author_name} (already has description)[/yellow]")
                        skipped += 1
                        progress.advance(task)
                        continue
                
                # Fetch podcasts by this author
                podcasts = fetch_podcasts_by_author(author_name)
                
                if not podcasts:
                    console.print(f"[yellow]No podcasts found for {author_name}, skipping...[/yellow]")
                    skipped += 1
                    progress.advance(task)
                    continue
                
                # Generate description
                description = generate_author_description(author_name, podcasts)
                
                # Upsert to database
                upsert_author(author_name, description, dry_run=args.dry_run)
                
                successful += 1
                
                # Rate limiting
                if not args.dry_run:
                    time.sleep(API_DELAY)
                
                progress.advance(task)
                
            except Exception as e:
                console.print(f"[red]Failed to process {author_name}: {e}[/red]")
                failed += 1
                progress.advance(task)
                continue
    
    # Summary
    console.print("\n" + "="*60)
    console.print(Panel.fit(
        f"[bold]Summary[/bold]\n\n"
        f"[green]Successful: {successful}[/green]\n"
        f"[yellow]Skipped: {skipped}[/yellow]\n"
        f"[red]Failed: {failed}[/red]",
        border_style="green" if successful > 0 else "yellow"
    ))


if __name__ == "__main__":
    main()

