# Google Analytics 4 Setup Guide

This guide will help you verify that events are being tracked and show you where to find them in GA4.

## ⚡ Quick Start: Events Not Showing?

**If you're seeing active users but no events in GA4 Real-time, start here:**

1. **Open your live website** (not localhost)
2. **Press F12** → **Console** tab
3. **Copy and paste this diagnostic script:**
   ```javascript
   console.log('=== GA4 Diagnostic ===');
   console.log('gtag exists:', typeof window.gtag === 'function');
   console.log('analytics exists:', typeof window.analytics === 'object');
   if (typeof window.gtag === 'function') {
     window.gtag('event', 'test_event', { test: true });
     console.log('✅ Test event sent! Check Network tab for "collect" requests.');
   }
   ```
4. **Check Network tab:**
   - Press F12 → **Network** tab
   - Filter by: `collect`
   - Interact with your site (play episode, search)
   - **If you see `collect` requests:** Events ARE being sent! See [Step 3 below](#step-3-events-are-being-sent-but-not-showing-in-ga4)
   - **If you DON'T see `collect` requests:** See [Step 4 below](#step-4-events-are-not-being-sent)

**For detailed step-by-step debugging, see the [Detailed Debugging section](#-detailed-debugging-events-not-showing-in-real-time) below.**

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

**✅ No manual setup needed!** These events are automatically created in GA4 when they're sent from your website. You don't need to add them manually.

**How it works:**
1. User interacts with your site (plays episode, searches, etc.)
2. Event is automatically sent to GA4
3. GA4 automatically creates the event (appears within 1-2 minutes)
4. Event shows up in **Reports → Engagement → Events**

**You only need to manually:**
- Mark events as conversions (optional - see section below)
- Create custom reports (optional)

### Page Navigation
- `page_view` - Every page view (automatic)

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

**Note:** These events will automatically appear in GA4 after they've been triggered at least once on your live site. No manual configuration needed!

---

## Mark Key Events as Conversions (Optional, 5 minutes)

**This is the ONLY manual step you need to do** - and it's completely optional!

Once events start appearing in GA4 (they'll show up automatically after being triggered), you can optionally mark important ones as "conversions" to track them as key actions.

### Step 1: Trigger Events First

Events must be sent at least once before they appear in GA4. On your live site:
- Play an episode (triggers `episode_play`)
- Let an episode finish (triggers `episode_complete`)
- Add a favorite podcast (triggers `add_favorite_podcast`)
- Search for something (triggers `search`)

### Step 2: Wait for Events to Appear

- **Reports → Engagement → Events:** Appears within 1-2 minutes ✅ (fastest)
- **Admin → Events:** May take 5-10 minutes

### Step 3: Mark as Conversions (Optional)

1. Go to **Admin** (gear icon) → **Events**
2. Find these events (they'll appear automatically after being sent):
   - `episode_play`
   - `episode_complete`
   - `add_favorite_podcast`
   - `add_favorite_episode`
3. Toggle the switch next to each one to mark as conversion

**Alternative:** If events don't appear in Admin → Events yet, you can mark them from **Reports → Engagement → Events** by clicking on the event name.

**Remember:** Marking events as conversions is optional. Your events are already being tracked - this just helps you identify your most important user actions.

---

## 🔍 Detailed Debugging: Events Not Showing in Real-Time

If you're seeing active users but no events in GA4 Real-time, follow these steps in order:

### Step 1: Run Complete Diagnostic (Copy & Paste This)

Open your **live website**, press **F12** → **Console** tab, then copy and paste this entire block:

```javascript
console.log('=== GA4 Complete Diagnostic ===');
console.log('1. gtag exists:', typeof window.gtag === 'function');
console.log('2. dataLayer exists:', Array.isArray(window.dataLayer));
console.log('3. dataLayer length:', window.dataLayer?.length || 0);
console.log('4. analytics object:', typeof window.analytics === 'object');
console.log('5. Measurement ID:', window.dataLayer?.find(item => item[0] === 'config')?.[2] || 'NOT FOUND');
console.log('6. Last 5 dataLayer items:', window.dataLayer?.slice(-5) || []);
console.log('7. Test event sending...');
if (typeof window.gtag === 'function') {
  window.gtag('event', 'diagnostic_test', { test: true });
  console.log('✅ Test event sent! Check Network tab for collect request.');
} else {
  console.error('❌ gtag is NOT available - GA script may not be loaded');
}
```

**What to look for:**
- ✅ `gtag exists: true` - GA script is loaded
- ✅ `analytics object: object` - Analytics functions are available
- ✅ `Measurement ID: G-9CDHCMHT8J` - Correct ID (or your ID)
- ❌ If any are `false` or `undefined`, GA isn't loading properly

### Step 2: Check Network Tab (Most Important)

1. **Press F12** → **Network** tab
2. **Clear the network log** (click the 🚫 icon)
3. **Filter by:** `collect` (type in the filter box)
4. **Interact with your site:**
   - Play an episode
   - Search for something
   - Navigate to a podcast page
5. **Look for requests** like: `https://www.google-analytics.com/g/collect?...`

**✅ If you see `collect` requests:** Events ARE being sent! The issue is GA4 not showing them (see Step 3).  
**❌ If you DON'T see `collect` requests:** Events aren't being sent (see Step 4).

### Step 3: Events Are Being Sent But Not Showing in GA4

If you see `collect` requests in Network tab but not in GA4:

1. **Check you're on the right property:**
   - In GA4, go to **Admin** → **Data Streams**
   - Click your web stream
   - Verify the **Measurement ID** matches `G-9CDHCMHT8J` (or your ID)

2. **Check Real-time location:**
   - Go to **Reports** → **Realtime** (left sidebar)
   - Scroll down to **"Event count by event name"** section
   - Make sure you're looking at the right section (not just "Active users")

3. **Try the manual test event:**
   ```javascript
   window.gtag('event', 'manual_test_event', { test: 'console' });
   ```
   - Wait 30 seconds
   - Check Real-time → "Event count by event name"
   - You should see `manual_test_event`

4. **Check Engagement → Events:**
   - Go to **Reports** → **Engagement** → **Events**
   - This shows ALL events (more reliable than Real-time)
   - Events appear here within 1-2 minutes

### Step 4: Events Are NOT Being Sent

If you DON'T see `collect` requests in Network tab:

1. **Check if GA script is loading:**
   - Network tab → Filter by: `gtag` or `googletagmanager`
   - You should see: `gtag/js?id=G-9CDHCMHT8J` (status 200)
   - ❌ If you don't see this: Script isn't loading (check ad blockers)

2. **Check browser console for errors:**
   - F12 → Console tab
   - Look for red errors about `gtag`, `googletagmanager`, or `analytics`
   - Fix any errors you see

3. **Disable ad blockers:**
   - Ad blockers often block Google Analytics
   - Try incognito/private mode
   - Or disable extensions temporarily

4. **Verify analytics.js is loading:**
   - Network tab → Filter by: `analytics.js`
   - Click on the request to see details
   - **Status should be 200** (success)
   - **Response should be JavaScript** (not HTML)
   - ❌ If you see **"Unexpected token '<'" error**: The server is returning HTML (404 page) instead of JavaScript
     - **Fix:** Run `npm run sync-web` to sync files
     - **Or:** Check that `public/web/analytics.js` exists
     - **Or:** Redeploy your site

5. **Check if events are actually being triggered:**
   - The code checks `if (window.analytics && currentPodcast)` before sending events
   - Make sure you're actually playing episodes (not just viewing pages)
   - Try manually calling: `window.analytics.trackEpisodePlay({id: 'test'}, {id: 'test', title: 'Test'})`

### Step 5: Verify Event Names Match

Run this in console to see what events are being sent:

```javascript
// Monitor dataLayer for new events
const originalPush = window.dataLayer.push;
window.dataLayer.push = function(...args) {
  if (args[0] === 'event') {
    console.log('📊 Event sent:', args[1], args[2]);
  }
  return originalPush.apply(window.dataLayer, args);
};
console.log('✅ Event monitor active. Interact with your site to see events.');
```

Then interact with your site - you should see events logged in console.

## Troubleshooting

### "I see active users but no events"

**This usually means:**
1. Events haven't been triggered yet - you need to actually interact with the site (play episodes, search, etc.)
2. You're looking in the wrong place - check **Reports → Engagement → Events** instead of just Real-time
3. Events are being sent but GA4 hasn't processed them yet (wait 5-10 minutes)

**To fix:**
1. **Run the diagnostic script above** (Step 1)
2. **Check Network tab** (Step 2) - this is the most reliable test
3. **Trigger events:** Actually play an episode, search, add favorites on your live site
4. **Check the right place:** Go to **Reports → Engagement → Events** (not just Real-time)

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

### "analytics.js:1 Uncaught SyntaxError: Unexpected token '<'"

**This error means:** The browser is getting HTML (probably a 404 page) instead of JavaScript.

**To fix:**
1. **Check Network tab:**
   - F12 → Network tab → Filter by: `analytics.js`
   - Click on the request
   - If status is **404** or response is HTML: File isn't being served correctly

2. **Sync files:**
   ```bash
   npm run sync-web
   ```
   This copies `web/analytics.js` to `public/web/analytics.js`

3. **Verify file exists:**
   - Check that `public/web/analytics.js` exists
   - Check that `web/analytics.js` exists (source file)

4. **Redeploy:**
   - Commit and push changes
   - Wait for Vercel to rebuild (2-5 minutes)

5. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or try incognito mode

