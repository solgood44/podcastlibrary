# Google Analytics 4 Setup Guide

This guide will help you verify that events are being tracked and show you where to find them in GA4.

## Quick Verification (Do This First)

### Step 1: Verify Events Are Being Sent (2 minutes)

**This is the most important step** - it tells you if events are actually being sent to Google Analytics.

1. **Open your live website** (not localhost)
2. **Press F12** to open Developer Tools
3. **Click the "Network" tab**
4. **In the filter box, type:** `collect` or `google-analytics`
5. **Interact with your site:**
   - Play an episode
   - Search for something
   - Navigate to a podcast page
   - Add a favorite

6. **You should see requests appearing** like:
   - `https://www.google-analytics.com/g/collect?...`

**✅ If you see these requests:** Events ARE being sent! Continue to Step 2.  
**❌ If you don't see these requests:** Events aren't being sent. Check:
   - Are you on the live site (not localhost)?
   - Is an ad blocker enabled? (Try disabling it)
   - Check the browser console (F12 → Console) for errors

---

### Step 2: Find Events in GA4 (3 minutes)

Events appear in different places in GA4. Here's where to look:

#### Option A: Real-Time Reports (Shows events within 30 seconds)

1. Go to https://analytics.google.com
2. Select your **GA4 property**
3. Click **Reports** → **Realtime** (in the left sidebar)
4. **Interact with your site** (play episode, search, etc.)
5. **Look at the "Event count by event name" section**
6. Events should appear within 30 seconds

**✅ If you see events here:** Everything is working! Events are being tracked.

#### Option B: Engagement → Events (Shows all events)

1. Go to **Reports** → **Engagement** → **Events**
2. This shows ALL events that have been sent
3. Events appear here within 1-2 minutes

**Note:** If you just set up GA4, you may need to wait a few minutes for events to appear.

#### Option C: Admin → Events (For marking conversions)

1. Go to **Admin** (gear icon) → **Events**
2. Events may take 5-10 minutes to appear here after first being sent
3. This is where you mark events as conversions

---

## Events That Are Tracked

These events are automatically sent when users interact with your site:

### Page Navigation
- `page_view` - Every page view

### Audio Playback
- `episode_play` - When user starts playing an episode
- `episode_pause` - When user pauses (includes progress %)
- `episode_complete` - When episode finishes
- `episode_seek` - When user seeks to different position
- `episode_progress` - Milestones at 25%, 50%, 75%, 90%

### Content Views
- `view_podcast` - When user views a podcast's episode list
- `view_author` - When user views an author's page

### User Actions
- `search` - Search queries with results count
- `add_favorite_podcast` / `remove_favorite_podcast`
- `add_favorite_episode` / `remove_favorite_episode`
- `add_favorite_author` / `remove_favorite_author`
- `view_category` - Category browsing
- `change_view_mode` - Grid vs List view
- `change_filter` - Filter/sort changes

---

## Mark Key Events as Conversions (Optional, 5 minutes)

Once you see events appearing in GA4, you can mark important ones as conversions:

1. **First, trigger the events on your site:**
   - Play an episode (triggers `episode_play`)
   - Let an episode finish (triggers `episode_complete`)
   - Add a favorite podcast (triggers `add_favorite_podcast`)

2. **Wait 5-10 minutes** for events to appear in Admin

3. **Go to Admin → Events:**
   - Click **Admin** (gear icon) → **Events**
   - Find these events:
     - `episode_play`
     - `episode_complete`
     - `add_favorite_podcast`
     - `add_favorite_episode`
   - Toggle the switch next to each one to mark as conversion

**Note:** If events don't appear in Admin → Events, you can also mark them from **Reports → Engagement → Events** by clicking on the event name.

---

## Troubleshooting

### "I see active users but no events"

**This usually means:**
1. Events haven't been triggered yet - you need to actually interact with the site (play episodes, search, etc.)
2. You're looking in the wrong place - check **Reports → Engagement → Events** instead of just Real-time
3. Events are being sent but GA4 hasn't processed them yet (wait 5-10 minutes)

**To fix:**
1. **Verify events are being sent:** Use Step 1 (Network tab) above
2. **Trigger events:** Actually play an episode, search, add favorites on your live site
3. **Check the right place:** Go to **Reports → Engagement → Events** (not just Real-time)

### "No events in Network tab"

**Check:**
- Are you on the **live site** (not localhost)?
- Is an **ad blocker** enabled? (Try disabling it or using incognito mode)
- Check browser **console** (F12 → Console) for JavaScript errors
- Verify the GA script is loading (Network tab → look for `gtag/js`)

### "Events in Real-time but not in other reports"

**This is normal!** GA4 has processing delays:
- Real-time: Shows events within 30 seconds
- Engagement → Events: Shows events within 1-2 minutes
- Admin → Events: May take 5-10 minutes
- Standard reports: May take 24-48 hours

### "Wrong Measurement ID"

If your Measurement ID is different from `G-9CDHCMHT8J`:

1. In GA4, go to **Admin** → **Data Streams** → Click your web stream
2. Copy the **Measurement ID** (starts with `G-`)
3. Update these files:
   - `pages/_app.js` - Change the Measurement ID
   - `web/index.html` - Change the ID in the script tag
   - `web/analytics.js` - Change the ID in the config
4. Redeploy your site

---

## Quick Test: Send Manual Event

To verify GA4 is working, run this in your browser console (F12 → Console):

```javascript
window.gtag('event', 'test_manual_event', {
  event_category: 'test',
  event_label: 'console_test'
});
console.log('Test event sent! Check GA4 Real-time in 30 seconds.');
```

Then check **Reports → Realtime** → "Event count by event name" - you should see `test_manual_event` appear within 30 seconds.

---

## Summary

1. **First:** Verify events are being sent (Network tab - Step 1)
2. **Second:** Check Real-time reports (Step 2, Option A)
3. **Third:** Check Engagement → Events (Step 2, Option B)
4. **Optional:** Mark key events as conversions

**Remember:** Events only appear in GA4 after they've been triggered on your live site. If you're only seeing active users, you need to actually interact with the site (play episodes, search, etc.) to trigger events.

---

## Need More Help?

If events show in the Network tab but not in GA4:
- Wait 5-10 minutes (GA4 processing delay)
- Make sure you're looking at the correct GA4 property
- Check the date range in reports (should include today)
- Verify you're on the live site, not localhost

If events don't show in the Network tab:
- Check for JavaScript errors in console
- Disable ad blockers
- Verify GA script is loading (Network tab → `gtag/js`)

