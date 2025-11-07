# GA4 Quick Setup Checklist

This is a streamlined checklist for the manual GA4 admin tasks. The tracking code is already working - you just need to configure a few things in the GA4 interface.

## ✅ Already Done (No Action Needed)
- ✅ Event tracking code implemented
- ✅ All events are being sent to GA4
- ✅ Basic page view tracking working
- ✅ Privacy settings configured

## 📋 Manual Setup Steps (15-20 minutes)

### Step 1: Verify Tracking is Working (2 minutes)

1. Go to your GA4 property: https://analytics.google.com
2. Click **Reports** → **Realtime**
3. Visit your website and perform some actions (play an episode, search, etc.)
4. You should see events appearing in real-time

**✅ Done when:** You see events like `episode_play`, `search`, `page_view` in real-time

---

### Step 2: Set Up Custom Dimensions (5 minutes)

1. Go to **Admin** (gear icon) → **Custom Definitions** → **Custom Dimensions**
2. Click **Create custom dimension** for each:

#### Dimension 1: User Type
- **Dimension name:** `user_type`
- **Scope:** User
- **Description:** Whether user is authenticated or guest
- Click **Create**

#### Dimension 2: Content Type  
- **Dimension name:** `content_type`
- **Scope:** Event
- **Description:** Type of content viewed (podcast, episode, author)
- Click **Create**

#### Dimension 3: Podcast Genre
- **Dimension name:** `podcast_genre`
- **Scope:** Event
- **Description:** Genre of podcast
- Click **Create**

**✅ Done when:** All 3 dimensions are created (they'll show as "Active" after 24-48 hours)

---

### Step 3: Mark Key Events as Conversions (3 minutes)

1. Go to **Admin** → **Events**
2. Find these events and toggle the **Mark as conversion** switch:

- ✅ `episode_play` - User starts playing an episode
- ✅ `episode_complete` - User finishes an episode
- ✅ `add_favorite_podcast` - User favorites a podcast
- ✅ `add_favorite_episode` - User favorites an episode

**✅ Done when:** These 4 events show "Conversion" badge

---

### Step 4: Create One Essential Report (5 minutes)

#### Episode Performance Report

1. Go to **Explore** → **Blank**
2. Name it: **"Episode Performance"**
3. **Dimensions:** Add:
   - `Event name`
   - `Episode title` (from event parameters)
   - `Podcast title` (from event parameters)
4. **Metrics:** Add:
   - `Event count`
   - `Total users`
5. **Values:** 
   - Add filter: `Event name` = `episode_play`
6. Click **Save**

**✅ Done when:** Report is saved and you can see episode play data

---

### Step 5: Set Up One Alert (Optional, 2 minutes)

1. Go to **Admin** → **Custom Alerts**
2. Click **Create alert**
3. Name: **"Traffic Spike"**
4. Condition: **Sessions** > **150%** of previous day
5. Click **Create**

**✅ Done when:** Alert is created

---

## 🎯 That's It!

After completing these steps, you'll have:
- ✅ Custom dimensions for better analysis
- ✅ Conversions tracking for key actions
- ✅ One custom report for episode performance
- ✅ Optional alert for traffic monitoring

## 📊 What You Can Do Now

Even without the manual setup, you can:
- View real-time events
- See standard reports (Audience, Engagement, etc.)
- Analyze event data in the Events report
- Export data for analysis

The manual setup just makes it easier to analyze and gives you better insights.

## 🔍 Quick Reference: Where to Find Things

- **Real-time data:** Reports → Realtime
- **All events:** Reports → Engagement → Events
- **Custom dimensions:** Admin → Custom Definitions → Custom Dimensions
- **Conversions:** Admin → Events (toggle "Mark as conversion")
- **Custom reports:** Explore → Your reports

## ⚠️ Important Notes

1. **Data Delay:** Custom dimensions take 24-48 hours to become active
2. **Historical Data:** Custom dimensions only apply to new data (not retroactive)
3. **Event Parameters:** Some event parameters (like `episode_title`) appear automatically in reports after events fire

## 🆘 Need Help?

If you see events in Real-time but not in other reports:
- Wait 24-48 hours (GA4 has processing delays)
- Check date range in reports
- Verify you're looking at the right property

The code is working - GA4 just needs time to process and organize the data!

