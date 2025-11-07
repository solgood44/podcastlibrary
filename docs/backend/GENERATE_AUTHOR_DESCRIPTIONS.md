# Generate Author Descriptions

This script generates SEO-friendly author descriptions using OpenAI GPT API and stores them in the database.

## Prerequisites

1. **Database Setup**: Run the authors table schema first:
   ```bash
   # In Supabase SQL Editor, run:
   # backend/authors_schema.sql
   ```

2. **Environment Variables**: Make sure your `.env` file has:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

### Basic Usage (Generate all author descriptions)
```bash
cd backend
python3 generate_author_descriptions.py
```

### Test with Limit (First 5 authors)
```bash
python3 generate_author_descriptions.py --limit 5
```

### Dry Run (Preview without saving)
```bash
python3 generate_author_descriptions.py --dry-run
```

### Skip Existing (Only generate for authors without descriptions)
```bash
python3 generate_author_descriptions.py --skip-existing
```

## Options

- `--dry-run`: Preview changes without updating the database
- `--limit N`: Only process first N authors (useful for testing)
- `--skip-existing`: Skip authors that already have descriptions

## What It Does

1. Fetches all unique authors from the podcasts table (excluding specified ones)
2. For each author:
   - Fetches all works (podcasts/books) by that author
   - Generates an SEO-friendly **literary biography** using GPT-4o-mini
   - Treats authors as literary figures/writers, not podcasters
   - Stores the biography in the `authors` table
   - **Overwrites existing descriptions** (unless `--skip-existing` is used)
3. Uses rate limiting (1 second delay between API calls)

## Biography Style

The script generates **author biographies** (not podcaster profiles) that:
- Write about authors as literary figures and writers
- Include SEO keywords for author searches (e.g., "author biography", "books by [author]", "literary works")
- Focus on the author's contribution to literature and writing style
- Mention notable works naturally within the biography
- Are 200-300 words, optimized for search engines
- Read like Wikipedia-style biography entries

## Output

The script will show:
- Progress bar with current author being processed
- Success/failure status for each author
- Summary at the end with counts

## Notes

- The script excludes: "solgoodmedia", "solgoodmedia.com", "sol good network", "sol good media", "public domain"
- Descriptions are 150-250 words, SEO-optimized, and written in third person
- Uses GPT-4o-mini model for cost efficiency
- Descriptions are cached in the frontend after first load

