# Cleanup & Reliability Guide

Summary of where to clean up the codebase, why feed updates may have stopped, how to run lightweight (daily-only) feed updates, and how to ensure the site is working.

---

## 1. Why cron jobs may have stopped (feed updates)

Feed updates run via **GitHub Actions**, not system cron. The workflow is `.github/workflows/update-feeds.yml` (scheduled every 6 hours).

**Common reasons it stops:**

| Cause | What to do |
|-------|------------|
| **Secrets missing or wrong** | Repo → Settings → Secrets and variables → Actions. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and correct (e.g. key not rotated). |
| **Actions disabled** | Repo → Settings → Actions → General: allow "Workflows" and "Read and write permissions" if needed. |
| **Scheduled runs paused** | GitHub can disable scheduled workflows in inactive repos. Trigger a manual run: Actions → "Update Podcast Feeds" → "Run workflow". |
| **Workflow or path changed** | Confirm `backend/feed_ingestor.py` and `backend/feeds.csv` exist and the job runs from repo root with `cd backend` before `python feed_ingestor.py`. |
| **Failures every run** | Check the last run’s logs (Actions → Update Podcast Feeds → latest run). Fix env (e.g. `.env` not in repo; use secrets) or script errors. |

**Quick check:** Actions → "Update Podcast Feeds" → "Run workflow". If it fails, open the failed job and read the error (often missing secrets or Python/import errors).

---

## 2. Lightweight updates: only daily feeds

To reduce load and only refresh feeds that publish daily:

1. **Add a `daily` column to `backend/feeds.csv`** (optional column; any name in the list below is fine):

   ```csv
   RSS,genre,daily
   https://example.com/feed1.rss,,1
   https://example.com/feed2.rss,,daily
   https://example.com/feed3.rss,,yes
   ```

   Supported values for “include this feed when daily-only”: `1`, `true`, `yes`, `daily`, `day` (case-insensitive). Leave empty or omit the column for feeds you don’t want in the daily pass.

2. **Enable daily-only in the workflow** (or when running locally):

   In `.github/workflows/update-feeds.yml`, under the "Run feed ingestor" step, add:

   ```yaml
   env:
     SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
     SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
     CSV_PATH: ./feeds.csv
     ONLY_DAILY_FEEDS: "true"
   ```

   For a full refresh of all feeds, either remove `ONLY_DAILY_FEEDS` or set it to `"false"` (or run a separate scheduled job without it).

3. **Optional: separate schedules**

   - One job with `ONLY_DAILY_FEEDS: "true"` (e.g. every 6–12 hours) for daily shows.
   - Another job without it (e.g. once per day or week) for the full list.

---

## 3. Ensuring the site is working

- **Feed pipeline**
  - Run the workflow manually (Actions → Update Podcast Feeds → Run workflow) and confirm it succeeds.
  - Locally: `cd backend && python feed_ingestor.py` (with `.env` or same env as GitHub). Check Supabase for updated `last_refreshed` or new episodes.
- **Site and API**
  - Open the deployed site; check homepage, a podcast page, and playback.
  - If you have an API base URL, hit a known endpoint (e.g. podcasts list) and confirm 200 and expected data.
- **Supabase**
  - Dashboard → Table Editor: spot-check `podcasts` and `episodes` for recent data and no obvious breakage.
- **Ongoing checks**
  - Option A: Re-use the same workflow; add a step that curls your site or API and fails the job if it gets a non-2xx response.
  - Option B: External monitor (e.g. UptimeRobot, cron-job.org) hitting your homepage or health URL every N minutes.
  - Option C: A simple serverless “health” route that returns 200 (and optionally checks DB connectivity); then point the monitor at that URL.

---

## 4. Codebase cleanups

| Area | Suggestion |
|------|------------|
| **Duplicate feed URL** | Remove duplicate entries in `backend/feeds.csv` (e.g. one feed was listed twice; already fixed for one duplicate). |
| **web/ vs public/web/** | Both exist with overlapping files (`app.js`, `auth.js`, `index.html`, etc.). Decide one source of truth (e.g. `web/`) and have the other point to it or be removed to avoid drift. |
| **Backend requirements** | `backend/requirements.txt` includes deps for other scripts (e.g. OpenAI, Pillow, mutagen). The feed ingestor only needs: `feedparser`, `python-dateutil`, `supabase`, `httpx`, `python-dotenv`, `rich`. For a lean CI job, you can add a `backend/requirements-feed.txt` with just those and use it in the update-feeds workflow. |
| **Large app.js** | `web/app.js` / `public/web/app.js` are very large (~7k+ lines). Consider splitting by route or feature (e.g. player, list, auth) for maintainability. |
| **Docs and SQL** | Several one-off SQL and doc files in `backend/` and `docs/` (e.g. fix_authors_rls_*, GET_USER_STATS). Archive or merge into main schema/docs and remove duplicates. |

---

## 5. Quick reference

- **Workflow file:** `.github/workflows/update-feeds.yml`
- **Feed list:** `backend/feeds.csv` (optional column: `daily` for daily-only runs)
- **Ingestor:** `backend/feed_ingestor.py`
- **Env for daily-only:** `ONLY_DAILY_FEEDS=true`
- **Manual run:** `cd backend && python feed_ingestor.py` (with Supabase env set)
