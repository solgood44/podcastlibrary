# Step-by-Step Vercel Deployment Guide

This guide will walk you through deploying your podcast website to Vercel with a custom domain.

## Prerequisites

- ✅ Your code is ready in the `web` folder
- ✅ You have a GitHub account (for auto-deploy)
- ✅ You have a domain name (or will use Vercel's free domain)
- ✅ Supabase is already set up

---

## Part 1: Deploy to Vercel

### Step 1: Install Vercel CLI

Open your terminal and run:

```bash
npm install -g vercel
```

If you don't have Node.js/npm installed, download it from [nodejs.org](https://nodejs.org/)

### Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate with Vercel.

### Step 3: Navigate to Your Web Folder

```bash
cd /Users/solomon/Coding/podcastwebsite/web
```

### Step 4: Deploy to Vercel

```bash
vercel
```

**When prompted:**
- **Set up and deploy?** → Type `Y` and press Enter
- **Which scope?** → Select your account
- **Link to existing project?** → Type `N` (first time) or `Y` (if updating)
- **Project name?** → Press Enter to use default, or type a custom name
- **Directory?** → Type `.` (current directory) and press Enter
- **Override settings?** → Type `N` and press Enter

### Step 5: Deploy to Production

After the first deployment, you'll get a preview URL. To deploy to production:

```bash
vercel --prod
```

**You now have a live site!** 🎉 (e.g., `your-project.vercel.app`)

---

## Part 2: Set Up Automatic Deployments (Recommended)

This way, every time you push to GitHub, your site updates automatically.

### Step 1: Push Your Code to GitHub

If you haven't already:

```bash
cd /Users/solomon/Coding/podcastwebsite

# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/podcastwebsite.git
git push -u origin main
```

### Step 2: Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository (`podcastwebsite`)
5. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `web` (click "Edit" and set it to `web`)
   - **Build Command:** (leave empty - it's a static site)
   - **Output Directory:** `.` (current directory)
   - **Install Command:** (leave empty)
6. Click **"Deploy"**

**Now every push to `main` branch will auto-deploy!** 🚀

---

## Part 3: Add Custom Domain

### Step 1: Add Domain in Vercel

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Domains**
3. Enter your domain (e.g., `podcasts.yourdomain.com` or `yourdomain.com`)
4. Click **"Add"**

### Step 2: Configure DNS

Vercel will show you DNS instructions. You need to add one of these:

**Option A: CNAME Record (for subdomain like `podcasts.yourdomain.com`)**
- **Type:** CNAME
- **Name:** `podcasts` (or `www` for www subdomain)
- **Value:** `cname.vercel-dns.com`
- **TTL:** 3600 (or default)

**Option B: A Record (for root domain like `yourdomain.com`)**
- **Type:** A
- **Name:** `@` (or leave blank)
- **Value:** `76.76.21.21` (Vercel will provide the exact IP)
- **TTL:** 3600

**Where to add DNS:**
- Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- Go to DNS Management
- Add the record as shown above

### Step 3: Wait for DNS Propagation

- DNS changes can take a few minutes to 24 hours
- Vercel will show "Valid Configuration" when it's ready
- Check status in Vercel dashboard → Domains

### Step 4: SSL Certificate

Vercel automatically provisions SSL certificates (HTTPS) - no action needed!

---

## Part 4: Configure Supabase CORS

**IMPORTANT:** Your site won't work without this!

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Scroll to **"Allowed CORS Origins"**
5. Add your domains:
   - `https://your-project.vercel.app` (your Vercel URL)
   - `https://yourdomain.com` (your custom domain)
   - `https://www.yourdomain.com` (if using www)
   - `http://localhost:8000` (for local development)
6. Click **"Save"**

---

## Part 5: Set Up RSS Feed Automation

Your RSS feeds need to update automatically so new episodes appear.

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

**Add these two secrets:**

**Secret 1:**
- **Name:** `SUPABASE_URL`
- **Value:** `https://wraezzmgoiubkjkgapwm.supabase.co` (your Supabase URL)

**Secret 2:**
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** (Get this from Supabase Dashboard → Settings → API → `service_role` key - **keep this secret!**)

### Step 2: Verify Workflow File Exists

Check that `.github/workflows/update-feeds.yml` exists in your repo. It should already be there!

### Step 3: Test the Workflow

1. Go to your GitHub repo
2. Click **Actions** tab
3. You should see "Update Podcast Feeds" workflow
4. Click on it → **"Run workflow"** → **"Run workflow"** button
5. Watch it run - it should process your feeds!

### Step 4: Verify It's Scheduled

The workflow runs automatically every 6 hours. To change frequency:
- Edit `.github/workflows/update-feeds.yml`
- Change the cron schedule (see file for examples)
- To only refresh “daily” feeds and keep runs light: add a `daily` column to `feeds.csv` and set `ONLY_DAILY_FEEDS: "true"` in the workflow env. See [CLEANUP_AND_RELIABILITY.md](../CLEANUP_AND_RELIABILITY.md).

---

## Part 6: Verify Everything Works

### Test Checklist

- [ ] Site loads at your Vercel URL
- [ ] Site loads at your custom domain (if configured)
- [ ] HTTPS works (green lock icon)
- [ ] Podcasts load from Supabase
- [ ] Episodes display correctly
- [ ] Audio player works
- [ ] Search works
- [ ] GitHub Actions workflow runs successfully
- [ ] New episodes appear after workflow runs

### Manual Feed Update Test

To test RSS updates manually:

```bash
cd /Users/solomon/Coding/podcastwebsite/backend
python3 feed_ingestor.py
```

Check your Supabase dashboard to see if new episodes were added.

---

## Troubleshooting

### "Site not loading"
- Check DNS configuration
- Wait for DNS propagation (can take up to 24 hours)
- Verify domain is added in Vercel dashboard

### "CORS Error" in browser console
- Make sure you added your domain to Supabase CORS settings
- Check that you're using HTTPS (not HTTP)

### "GitHub Actions failing"
- Verify secrets are set correctly
- Check workflow file exists: `.github/workflows/update-feeds.yml`
- Check that `feeds.csv` is in the `backend` folder in your repo

### "No new episodes appearing"
- Check GitHub Actions logs (Actions tab)
- Verify Supabase credentials in secrets
- Manually run `python3 feed_ingestor.py` to test

### "Audio not playing"
- Check browser console for errors
- Verify episodes have valid `audio_url` in Supabase
- Some podcast hosts block direct playback (may need proxy)

---

## Quick Reference Commands

```bash
# Deploy to Vercel (first time)
cd web
vercel

# Deploy to production
vercel --prod

# Update and push code
git add .
git commit -m "Update description"
git push  # Auto-deploys if connected!

# Manually update RSS feeds
cd backend
python3 feed_ingestor.py
```

---

## Next Steps

1. ✅ **Deploy to Vercel** (Steps 1-5)
2. ✅ **Set up auto-deploy** (Part 2)
3. ✅ **Add custom domain** (Part 3)
4. ✅ **Configure CORS** (Part 4)
5. ✅ **Set up RSS automation** (Part 5)
6. ✅ **Test everything** (Part 6)

Your site should now be live and updating automatically! 🎉

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Supabase Docs:** https://supabase.com/docs

