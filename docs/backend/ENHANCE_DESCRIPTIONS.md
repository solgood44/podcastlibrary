# Enhance Podcast Descriptions

This script uses OpenAI ChatGPT API to enhance podcast descriptions for better SEO.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Add OpenAI API key to `.env`:**
   ```bash
   OPENAI_API_KEY=sk-your-api-key-here
   ```
   (Your existing Supabase keys should already be there)

## Usage

### Basic Usage (Preview Only)
Test with a dry run to see what changes would be made:
```bash
python3 enhance_descriptions.py --dry-run
```

### Test with a Few Podcasts
Process only the first 5 podcasts:
```bash
python3 enhance_descriptions.py --dry-run --limit 5
```

### Update All Podcasts
Once you're happy with the preview, run for real:
```bash
python3 enhance_descriptions.py
```

### Options

- `--dry-run`: Preview changes without updating Supabase
- `--limit N`: Only process first N podcasts (for testing)
- `--skip-empty`: Skip podcasts with empty descriptions
- `--skip-enhanced`: Skip podcasts that appear to already be enhanced (detects AI-generated descriptions)

### Examples

**Preview first 3 podcasts:**
```bash
python3 enhance_descriptions.py --dry-run --limit 3
```

**Update only podcasts with existing descriptions:**
```bash
python3 enhance_descriptions.py --skip-empty
```

**Update all podcasts (including empty ones):**
```bash
python3 enhance_descriptions.py
```

**Continue from where you left off (skip already enhanced):**
```bash
python3 enhance_descriptions.py --skip-enhanced
```

**Process remaining podcasts that weren't enhanced:**
```bash
python3 enhance_descriptions.py --skip-enhanced --skip-empty
```

## How It Works

1. Fetches **all** podcasts from Supabase (handles pagination automatically)
2. For each podcast, sends the current description to ChatGPT with a prompt to:
   - Make it SEO-friendly
   - Expand to 150-250 words
   - Maintain original meaning and tone
   - Use natural, engaging language
3. Updates the description in Supabase
4. Includes rate limiting (0.5s delay between requests)

## Cost Estimate

- Using `gpt-4o-mini`: ~$0.01-0.05 per podcast description
- For 100 podcasts: ~$1-5 one-time cost
- For 1000 podcasts: ~$10-50 one-time cost

## Model Options

The script uses `gpt-4o-mini` by default for cost efficiency. To use a different model, edit `enhance_descriptions.py` and change:
```python
model="gpt-4o-mini",  # Change to "gpt-4" for better quality
```

## Publishing Changes

**Supabase changes are IMMEDIATE** - When you run the script (without `--dry-run`), descriptions are updated in your Supabase database right away and will appear on your website immediately.

**Code changes need git push** - If you modify the script itself, you'll need to commit and push to git for those changes to be saved.

## Safety Features

- Dry-run mode to preview changes
- Rate limiting to avoid API throttling
- Error handling with detailed messages
- Progress tracking with rich console output
- Pagination support (fetches all podcasts, not just first 1000)
- Skip already-enhanced descriptions with `--skip-enhanced` flag

