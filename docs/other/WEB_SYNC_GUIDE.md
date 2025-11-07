# Web Directory Sync Guide

## Overview

This project uses two directories for web files:
- **`web/`** - Your source files (edit here!)
- **`public/web/`** - Served by Vercel/Next.js (auto-synced)

## How It Works

The `sync-web.js` script automatically copies files from `web/` to `public/web/` to keep them in sync.

## Usage

### Manual Sync
```bash
npm run sync-web
```

### Automatic Sync
The sync runs automatically:
- **Before builds**: When you run `npm run build`, it syncs first
- **Before commits**: The `precommit` script syncs (if you have git hooks set up)

### Quick Workflow

1. **Edit files in `web/`** (e.g., `web/app.js`, `web/styles.css`)
2. **Run sync**:
   ```bash
   npm run sync-web
   ```
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

## Files That Get Synced

- `index.html`
- `app.js`
- `styles.css`
- `api.js`
- `auth.js`
- `config.js`
- `vercel.json`

## Why This Setup?

- **`web/`** is at the root level, making it easy to find and edit
- **`public/web/`** is where Next.js serves static files
- The sync script ensures both stay in sync automatically

## Troubleshooting

**If changes don't appear on the live site:**
1. Make sure you edited files in `web/`
2. Run `npm run sync-web`
3. Commit and push the changes
4. Wait for Vercel to rebuild (usually 2-5 minutes)

**To verify files are synced:**
```bash
# Compare a file
diff web/app.js public/web/app.js
# Should show no differences if synced
```

