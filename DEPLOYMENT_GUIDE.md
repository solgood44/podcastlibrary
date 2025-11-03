# Deployment Guide

This guide covers how to publish your podcast website to a domain, keep the codebase updated, and automate RSS feed updates.

## Table of Contents

1. [Publishing to a Domain](#publishing-to-a-domain)
2. [Codebase Update Best Practices](#codebase-update-best-practices)
3. [RSS Feed Automation](#rss-feed-automation)

---

## Publishing to a Domain

### Option 1: Netlify (Recommended for Simplicity)

**Pros:** Free tier, automatic HTTPS, easy deployment, custom domains

**Steps:**

1. **Prepare your code:**
   ```bash
   # Ensure your web folder is ready
   cd web
   # Verify config.js has your Supabase credentials
   ```

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com) and sign up/login
   - Drag and drop your `web` folder to Netlify dashboard
   - OR use Netlify CLI:
     ```bash
     npm install -g netlify-cli
     netlify login
     netlify deploy --dir=web --prod
     ```

3. **Configure custom domain:**
   - In Netlify dashboard: Site Settings → Domain Management
   - Add your custom domain (e.g., `podcasts.yourdomain.com`)
   - Follow DNS setup instructions (add CNAME record pointing to your Netlify site)

4. **Environment variables (optional):**
   - If you want to keep credentials secure, use Netlify Environment Variables
   - Site Settings → Environment Variables
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - Update `config.js` to read from environment (requires build step)

**Cost:** Free tier includes 100GB bandwidth/month, custom domains

---

### Option 2: Vercel

**Pros:** Free tier, excellent performance, automatic HTTPS, great for static sites

**Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd web
   vercel
   # Follow prompts
   vercel --prod  # For production
   ```

3. **Custom domain:**
   - Vercel dashboard → Project → Settings → Domains
   - Add your domain and configure DNS

**Cost:** Free tier includes 100GB bandwidth/month

---

### Option 3: GitHub Pages

**Pros:** Free, integrated with GitHub, simple

**Steps:**

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/podcastwebsite.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - GitHub repo → Settings → Pages
   - Source: `main` branch, folder: `/web`
   - Custom domain: Add in Pages settings

3. **Update config.js:**
   - Your config.js is currently public (contains Supabase keys)
   - For production, consider:
     - Using environment variables (requires build step)
     - Or keeping it public (Supabase anon key is safe to expose)

**Cost:** Free

---

### Option 4: Cloudflare Pages

**Pros:** Free, fast CDN, excellent performance

**Steps:**

1. **Connect GitHub repo to Cloudflare Pages**
2. **Build settings:**
   - Build command: (leave empty, static site)
   - Build output: `web`
3. **Add custom domain in Cloudflare dashboard**

**Cost:** Free tier includes unlimited bandwidth

---

### Option 5: Traditional Web Hosting (cPanel, etc.)

**Steps:**

1. **Upload files via FTP/SFTP:**
   - Upload entire `web` folder contents to `public_html` or `www` directory
   - Ensure `index.html` is in the root

2. **Configure domain:**
   - Point domain to hosting provider's nameservers
   - Or configure A/CNAME records as instructed by hosting provider

3. **HTTPS:**
   - Enable SSL certificate (Let's Encrypt is free via most hosts)

---

### Important: Supabase CORS Configuration

After deploying, you **must** configure CORS in Supabase:

1. Go to Supabase Dashboard → Settings → API
2. Add your domain to "Allowed CORS Origins":
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`
   - `http://localhost:8000` (for local development)

---

## Codebase Update Best Practices

### 1. Version Control with Git

**Initial Setup:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/podcastwebsite.git
git push -u origin main
```

**Best Practices:**
- Use `.gitignore` to exclude sensitive files:
  ```gitignore
  # Environment files
  backend/.env
  *.env
  
  # Python
  __pycache__/
  *.pyc
  .venv/
  venv/
  
  # OS files
  .DS_Store
  Thumbs.db
  ```

- Commit frequently with clear messages:
  ```bash
  git add .
  git commit -m "Add new feature: episode search"
  git push
  ```

- Use branches for features:
  ```bash
  git checkout -b feature/new-feature
  # Make changes
  git commit -m "Add new feature"
  git push origin feature/new-feature
  # Create pull request on GitHub
  ```

---

### 2. Automated Deployment (CI/CD)

#### Netlify Auto-Deploy

1. **Connect GitHub repo:**
   - Netlify → Add new site → Import from Git
   - Connect GitHub, select your repo
   - Build settings:
     - Build command: (leave empty)
     - Publish directory: `web`

2. **Auto-deploy on push:**
   - Every push to `main` branch automatically deploys
   - Preview deployments for pull requests

#### GitHub Actions (For any hosting)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './web'
          production-branch: main
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

### 3. Environment Management

**For production, consider using environment variables:**

1. **Create a build script** (if using a build tool):
   ```javascript
   // build.js
   const fs = require('fs');
   const config = {
     url: process.env.SUPABASE_URL || 'https://wraezzmgoiubkjkgapwm.supabase.co',
     anonKey: process.env.SUPABASE_ANON_KEY || 'your-key'
   };
   fs.writeFileSync('web/config.js', 
     `const SUPABASE_CONFIG = ${JSON.stringify(config, null, 2)};`
   );
   ```

2. **Or keep config.js public** (simpler):
   - Supabase anon key is designed to be public
   - It's protected by Row Level Security (RLS) policies
   - Just ensure your RLS policies are correct

---

### 4. Update Workflow

**Recommended workflow:**

1. **Local development:**
   ```bash
   # Make changes
   # Test locally: python3 -m http.server 8000
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

3. **Auto-deploy:**
   - If using Netlify/Vercel with Git integration, deployment happens automatically
   - Monitor deployment status in dashboard

4. **Verify:**
   - Check deployed site
   - Test functionality
   - Monitor for errors

---

## RSS Feed Automation

Your `feed_ingestor.py` currently runs manually. To keep episodes updated automatically (especially for daily podcasts), you need to schedule it.

### Option 1: GitHub Actions (Recommended - Free)

**Pros:** Free, reliable, version-controlled

**Steps:**

1. **Create `.github/workflows/update-feeds.yml`:**
```yaml
name: Update Podcast Feeds

on:
  schedule:
    # Run every 6 hours (UTC time)
    - cron: '0 */6 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  update-feeds:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run feed ingestor
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CSV_PATH: ./backend/feeds.csv
        run: |
          cd backend
          python feed_ingestor.py
```

2. **Add secrets to GitHub:**
   - Repo → Settings → Secrets and variables → Actions
   - Add:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

3. **Upload feeds.csv:**
   - Ensure `feeds.csv` is in your repo
   - Or use GitHub Secrets for CSV content (if small)

**Cron schedule examples:**
- Every 6 hours: `0 */6 * * *`
- Every 4 hours: `0 */4 * * *`
- Every 2 hours: `0 */2 * * *`
- Daily at 2 AM: `0 2 * * *`
- Every 30 minutes: `*/30 * * * *` (for very active feeds)

---

### Option 2: Railway.app

**Pros:** Easy Python deployment, good free tier

**Steps:**

1. **Create `Procfile` in backend folder:**
   ```
   worker: python feed_ingestor.py
   ```

2. **Create `railway.json`:**
   ```json
   {
     "deploy": {
       "startCommand": "python feed_ingestor.py",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

3. **Deploy to Railway:**
   - Connect GitHub repo
   - Add environment variables
   - Set up cron job (Railway has built-in cron support)

**Cost:** Free tier includes 500 hours/month

---

### Option 3: Render.com

**Pros:** Free tier, easy setup

**Steps:**

1. **Create a new Web Service on Render**
2. **Connect your GitHub repo**
3. **Build settings:**
   - Build command: `cd backend && pip install -r requirements.txt`
   - Start command: `cd backend && python feed_ingestor.py`

4. **Set up Cron Job:**
   - Render → Cron Jobs → New Cron Job
   - Command: `cd backend && python feed_ingestor.py`
   - Schedule: `0 */6 * * *` (every 6 hours)

**Cost:** Free tier available

---

### Option 4: PythonAnywhere

**Pros:** Free tier, Python-focused

**Steps:**

1. **Sign up at pythonanywhere.com**
2. **Upload your code:**
   - Files → Upload `backend/` folder
   - Upload `feeds.csv`

3. **Set up scheduled task:**
   - Tasks → Create new task
   - Command: `python3 /home/username/path/to/feed_ingestor.py`
   - Schedule: Every 6 hours

4. **Environment variables:**
   - Create `.env` file or use Tasks environment variables

**Cost:** Free tier includes scheduled tasks

---

### Option 5: Your Own Server (VPS)

**Steps:**

1. **Set up cron job:**
   ```bash
   crontab -e
   ```

2. **Add cron entry:**
   ```
   # Run every 6 hours
   0 */6 * * * cd /path/to/backend && /usr/bin/python3 feed_ingestor.py >> /var/log/feed_ingestor.log 2>&1
   ```

3. **Or use systemd timer** (more robust):
   
   Create `/etc/systemd/system/feed-updater.service`:
   ```ini
   [Unit]
   Description=Podcast Feed Updater
   
   [Service]
   Type=oneshot
   User=youruser
   WorkingDirectory=/path/to/backend
   Environment="SUPABASE_URL=your_url"
   Environment="SUPABASE_SERVICE_ROLE_KEY=your_key"
   ExecStart=/usr/bin/python3 feed_ingestor.py
   ```

   Create `/etc/systemd/system/feed-updater.timer`:
   ```ini
   [Unit]
   Description=Run feed updater every 6 hours
   
   [Timer]
   OnCalendar=*-*-* 00,06,12,18:00:00
   Persistent=true
   
   [Install]
   WantedBy=timers.target
   ```

   Enable:
   ```bash
   sudo systemctl enable feed-updater.timer
   sudo systemctl start feed-updater.timer
   ```

---

### Recommended Schedule

For **daily podcasts** and **active feeds**, recommended schedule:

- **Every 4-6 hours**: Good balance between freshness and resource usage
- **Every 2 hours**: For very active feeds (many daily episodes)
- **Every 12 hours**: For weekly/monthly podcasts (less frequent)

**Your current setup:**
- The ingestor uses ETag/Last-Modified headers, so it won't re-download unchanged feeds
- It only processes feeds that have changed
- It only inserts new episodes (deduplicates by GUID)

**Monitor your feeds:**
- Check logs after first few runs
- Adjust frequency based on how often feeds actually update
- Daily podcasts typically update once per day, so 4-6 hour intervals are usually sufficient

---

### Monitoring and Alerts

**Add logging/alerting:**

1. **Email on errors** (GitHub Actions):
   ```yaml
   - name: Send email on failure
     if: failure()
     uses: dawidd6/action-send-mail@v3
     with:
       server_host: smtp.gmail.com
       server_port: 465
       username: ${{ secrets.EMAIL_USERNAME }}
       password: ${{ secrets.EMAIL_PASSWORD }}
       subject: Feed Update Failed
       body: Feed update job failed. Check GitHub Actions.
   ```

2. **Health check endpoint:**
   - Create a simple endpoint that checks last update time
   - Monitor with UptimeRobot or similar

---

## Summary Checklist

### Initial Deployment
- [ ] Choose hosting provider (Netlify/Vercel recommended)
- [ ] Deploy web folder
- [ ] Configure custom domain
- [ ] Set up DNS records
- [ ] Configure Supabase CORS
- [ ] Test deployed site

### Codebase Updates
- [ ] Set up Git repository
- [ ] Create `.gitignore`
- [ ] Connect to hosting provider (auto-deploy)
- [ ] Test deployment workflow

### RSS Feed Automation
- [ ] Choose automation method (GitHub Actions recommended)
- [ ] Set up scheduled job
- [ ] Configure environment variables/secrets
- [ ] Test first run
- [ ] Monitor logs
- [ ] Adjust schedule as needed

### Ongoing Maintenance
- [ ] Monitor feed update logs
- [ ] Check for errors regularly
- [ ] Update dependencies periodically
- [ ] Backup database (Supabase has automatic backups)
- [ ] Review and update feed schedule as needed

---

## Quick Reference

**Deploy web app:**
```bash
# Netlify (CLI)
netlify deploy --dir=web --prod

# Vercel
vercel --prod
```

**Update feeds manually:**
```bash
cd backend
python feed_ingestor.py
```

**Test locally:**
```bash
cd web
python3 -m http.server 8000
```

**Git workflow:**
```bash
git add .
git commit -m "Update description"
git push
```

---

## Need Help?

- **Netlify Docs:** https://docs.netlify.com
- **Vercel Docs:** https://vercel.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions
- **Supabase:** https://supabase.com/docs

