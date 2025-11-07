# GA4 Real-Time Reports Not Showing - Troubleshooting Guide

If you're not seeing real-time reports in Google Analytics, follow these steps:

## Step 1: Verify Your GA4 Property Exists

1. Go to https://analytics.google.com
2. Make sure you're logged into the correct Google account
3. Check that you have a GA4 property (not Universal Analytics)
4. Verify the Measurement ID matches `G-9CDHCMHT8J`

**If you don't have a GA4 property:**
- Create one at: https://analytics.google.com → Admin → Create Property
- Copy the Measurement ID (starts with `G-`)
- Update the code with your new ID (see below)

## Step 2: Check Browser Console for Errors

1. Open your website
2. Press `F12` (or right-click → Inspect)
3. Go to **Console** tab
4. Look for:
   - ✅ `gtag` function defined (no errors)
   - ❌ Any red errors about `gtag` or `googletagmanager`

**Common issues:**
- Ad blockers blocking GA (try disabling)
- Privacy extensions blocking tracking
- Network errors loading the GA script

## Step 3: Verify GA Script is Loading

1. Open your website
2. Press `F12` → **Network** tab
3. Filter by "gtag" or "googletagmanager"
4. Refresh the page
5. You should see:
   - ✅ `gtag/js?id=G-9CDHCMHT8J` (status 200)
   - ✅ `collect` requests being sent

**If you don't see these:**
- The script isn't loading
- Check ad blockers
- Check browser console for errors

## Step 4: Test GA is Working with Browser Console

1. Open your website
2. Press `F12` → **Console** tab
3. Type: `window.gtag`
4. You should see: `function gtag() { [native code] }`

5. Test sending an event:
```javascript
window.gtag('event', 'test_event', {
  event_category: 'test',
  event_label: 'manual_test'
});
```

6. Check if `dataLayer` exists:
```javascript
console.log(window.dataLayer);
```
You should see an array with GA config objects.

## Step 5: Check You're Looking in the Right Place

1. Go to https://analytics.google.com
2. Select your GA4 property
3. Click **Reports** (left sidebar)
4. Click **Realtime** (under Reports)
5. Wait 10-30 seconds after visiting your site

**Note:** Real-time reports show:
- Active users (should be 1 if you're on the site)
- Events by event name
- Pages and screens

## Step 6: Verify Measurement ID is Correct

1. In GA4, go to **Admin** (gear icon)
2. Click **Data Streams**
3. Click on your web stream
4. Copy the **Measurement ID** (starts with `G-`)
5. Compare with the ID in your code: `G-9CDHCMHT8J`

**If they don't match:**
- Update the code with the correct ID (see below)

## Step 7: Check for Ad Blockers

Ad blockers often block Google Analytics. Test:

1. **Disable all browser extensions** (especially ad blockers)
2. Try **Incognito/Private mode**
3. Try a **different browser**
4. Check if GA loads in Network tab

## Step 8: Verify You're Testing on the Live Site

- Real-time reports only work on **deployed/live sites**
- If testing locally (`localhost`), GA might not track properly
- Make sure you're testing on your actual domain

## Step 9: Wait a Few Minutes

Sometimes GA4 takes 1-5 minutes to show data in real-time reports, especially for new properties.

## Step 10: Check GA4 DebugView (Advanced)

1. Install **Google Analytics Debugger** Chrome extension
2. Enable it
3. Visit your site
4. In GA4, go to **Admin** → **DebugView**
5. You should see events appearing in real-time

## Quick Test Script

Add this to your browser console to test if GA is working:

```javascript
// Test if gtag exists
if (typeof window.gtag === 'function') {
  console.log('✅ GA is loaded');
  
  // Send a test event
  window.gtag('event', 'test_event', {
    event_category: 'debug',
    event_label: 'console_test',
    value: 1
  });
  
  console.log('✅ Test event sent');
  console.log('DataLayer:', window.dataLayer);
} else {
  console.error('❌ GA is NOT loaded');
}
```

## Common Issues & Solutions

### Issue: "No data in real-time"
**Solutions:**
- Wait 1-5 minutes
- Check ad blockers
- Verify Measurement ID
- Check browser console for errors

### Issue: "gtag is not defined"
**Solutions:**
- Script not loading (check Network tab)
- Ad blocker blocking GA
- Script loading after page load

### Issue: "Events not showing"
**Solutions:**
- Check event names match exactly
- Verify events are being sent (Network tab → filter "collect")
- Check GA4 DebugView

### Issue: "Wrong property"
**Solutions:**
- Make sure you're looking at the GA4 property (not Universal Analytics)
- Verify Measurement ID matches

## Still Not Working?

1. **Double-check Measurement ID** in GA4 Admin → Data Streams
2. **Test in incognito mode** (no extensions)
3. **Check Network tab** for GA script loading
4. **Verify you're on the live site** (not localhost)
5. **Wait 5-10 minutes** for new properties to start tracking

## Need to Update Measurement ID?

If your Measurement ID is different from `G-9CDHCMHT8J`:

1. Update `pages/_app.js` - change the default ID
2. Update `web/index.html` - change the ID in the script
3. Update `web/analytics.js` - change the ID in the config
4. Or set environment variable: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-YOUR-ID`

