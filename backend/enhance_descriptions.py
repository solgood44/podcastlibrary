#!/usr/bin/env python3
"""
Podcast Description Enhancer (GPT-5 Edition)
Enhances audiobook / story descriptions with factual accuracy and SEO value.
Includes hallucination fallback to prevent invented plot details.
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

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)
console = Console()

API_DELAY = 0.5


# ---------------- Link Detection ---------------- #

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


# ---------------- Factual-Safe Description Generator ---------------- #

def enhance_description(original_description: str, podcast_title: str, author: Optional[str] = None) -> str:
    """
    Generate or rewrite audiobook descriptions using GPT-4o-mini.
    Ensures: No invented plot events. Falls back to theme-only mode if needed.
    If description contains links, rewrites completely from scratch.
    """

    # Check if description contains links - if so, rewrite completely from scratch
    contains_links = has_links(original_description) if original_description else False
    
    if contains_links:
        # Rewrite from scratch using only title/author
        console.print(f"[yellow]Found links in description - rewriting from scratch based on title/author[/yellow]")
        original_description = ""  # Don't use the old description at all

    prompt = f"""
Write a clear and accurate single-paragraph audiobook description (500–1000 characters).

Content: "{podcast_title}" {f"by {author}" if author else ""}

Rules:
- DO NOT invent plot events, conflicts, tragedies, romances, deaths, or twists.
- If unsure about details, describe *themes, tone, and the listening experience*.
- Explain what the listener will appreciate + who the story appeals to.
- Use genre & thematic keywords naturally (no keyword stuffing).
- Warm, calm, confident tone. No hype. No spoilers. No filler.
- One paragraph. No markdown. NO URLs or links - write a clean description without any web addresses.

Original description (may be short, empty, or generic):
{original_description if original_description else "[none provided]"}
"""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        max_tokens=350,
        messages=[
            {"role": "system", "content": "You accurately summarize literature without guessing. You never invent events. When uncertain, you generalize to themes/tone."},
            {"role": "user", "content": prompt}
        ]
    )

    draft = response.choices[0].message.content.strip()
    draft = ' '.join(draft.split())

    # Remove any URLs/links that might have been generated
    draft = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', draft)
    draft = re.sub(r'www\.(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', draft)
    draft = ' '.join(draft.split())  # Clean up extra spaces

    # Hallucination detector: prevent false invented story elements
    red_flags = [
        "murder", "mysterious death", "crime spree", "haunting", "investigation",
        "war", "battle", "ghost", "town shaken", "tragic accident", "romantic affair",
        "secret child", "suicide", "kidnapping", "serial killer"
    ]

    source_text = (podcast_title + " " + (original_description or "")).lower()

    if any(word in draft.lower() and word not in source_text for word in red_flags):
        safety_prompt = f"""
The prior response invented events not supported by the source.
Rewrite again using ONLY themes, tone, mood, and narrative focus.
Do not describe specific scenes or events.
500–1000 characters. One paragraph.
Title: {podcast_title}  Author: {author}
"""
        fallback = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            max_tokens=300,
            messages=[
                {"role": "system", "content": "You strictly avoid guessing content. Provide thematic description only."},
                {"role": "user", "content": safety_prompt}
            ]
        )
        draft = fallback.choices[0].message.content.strip()
        draft = ' '.join(draft.split())

    # Enforce max length
    if len(draft) > 1000:
        truncated = draft[:1000]
        last_period = truncated.rfind('.')
        if last_period > 600:
            draft = truncated[:last_period+1]
        else:
            draft = truncated + "."

    return draft


# ---------------- Utility / Database Functions ---------------- #

def fetch_all_podcasts():
    try:
        all_podcasts = []
        page_size = 1000
        offset = 0

        while True:
            res = sb.table("podcasts").select("id,title,author,description").range(offset, offset+page_size-1).execute()
            if not res.data:
                break
            all_podcasts.extend(res.data)
            if len(res.data) < page_size:
                break
            offset += page_size
        return all_podcasts

    except Exception as e:
        console.print(f"[red]Error fetching podcasts: {e}[/red]")
        raise


def update_podcast_description(podcast_id: str, new_text: str):
    try:
        sb.table("podcasts").update({"description": new_text}).eq("id", podcast_id).execute()
    except Exception as e:
        console.print(f"[red]Error updating {podcast_id}: {e}[/red]")


# ---------------- Main Runner ---------------- #

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--skip-empty", action="store_true")
    parser.add_argument("--skip-enhanced", action="store_true")
    args = parser.parse_args()

    console.print(Panel.fit("[bold cyan]Podcast Description Enhancer[/bold cyan]", border_style="cyan"))

    podcasts = fetch_all_podcasts()
    if not podcasts:
        console.print("[yellow]No podcasts found.[/yellow]")
        return

    if args.skip_empty:
        podcasts = [p for p in podcasts if p.get("description") and p["description"].strip()]

    if args.skip_enhanced:
        # Simple check: if description is 500+ chars, assume enhanced
        original_count = len(podcasts)
        podcasts = [p for p in podcasts if not (p.get("description") and len(p.get("description", "").strip()) >= 500)]
        skipped_enhanced = original_count - len(podcasts)
        if skipped_enhanced > 0:
            console.print(f"[yellow]Skipping {skipped_enhanced} podcast(s) that appear already enhanced[/yellow]")

    if args.limit:
        podcasts = podcasts[:args.limit]

    total = len(podcasts)
    console.print(f"[green]Processing {total} items…[/green]\n")

    updated = 0
    errors = 0
    skipped = 0

    with Progress(
        SpinnerColumn(), TextColumn("{task.description}"), BarColumn(), MofNCompleteColumn(), TimeElapsedColumn()
    ) as progress:

        task = progress.add_task("Enhancing…", total=total)

        for i, p in enumerate(podcasts):
            title = p.get("title", "Unknown")
            desc = p.get("description", "").strip()
            author = p.get("author")

            try:
                progress.update(task, description=f"Processing: {title[:50]}...")
                
                new = enhance_description(desc, title, author)

                # Show preview for first few or in dry-run mode
                if i < 3 or args.dry_run:
                    console.print(f"\n[bold cyan]{title}[/bold cyan]")
                    if args.dry_run:
                        # Show full descriptions in dry-run mode
                        console.print(f"[dim]Original ({len(desc)} chars):[/dim]")
                        console.print(f"[dim]{desc if desc else '(empty)'}[/dim]")
                        console.print(f"\n[green]New ({len(new)} chars):[/green]")
                        console.print(f"[green]{new}[/green]\n")
                    else:
                        # Show truncated in normal mode
                        console.print(f"[dim]Original ({len(desc)} chars): {desc[:80]}...[/dim]")
                        console.print(f"[green]New ({len(new)} chars): {new[:150]}...[/green]\n")

                if not args.dry_run:
                    update_podcast_description(p["id"], new)
                    updated += 1
                else:
                    skipped += 1

                time.sleep(API_DELAY)
                
            except Exception as e:
                errors += 1
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


if __name__ == "__main__":
    main()
