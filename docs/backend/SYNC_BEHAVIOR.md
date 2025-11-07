# How Data Sync Works

## Overview

The app uses **localStorage** as the primary data store, whether you're signed in or not. When you sign in, it syncs with the server to enable cross-device access.

## Data Storage Behavior

### When NOT Signed In (Default)
- ✅ All data (favorites, history, progress) is stored in **localStorage only**
- ✅ Works completely offline
- ✅ Data stays on your device/browser
- ✅ No account required

### When Signed In
- ✅ localStorage still stores all data (for offline access)
- ✅ Data automatically syncs to server (debounced every 2 seconds)
- ✅ localStorage reflects the merged data from your account
- ✅ Changes sync across all your devices

## What Happens When You Sign In

1. **Upload Local Data**: Your current localStorage data is uploaded to the server
2. **Download Server Data**: Server data is downloaded and merged with local
3. **Smart Merge**: 
   - **History**: Combines both, removes duplicates, keeps most recent
   - **Favorites**: Combines both arrays, removes duplicates
   - **Progress**: Merges playback positions (server takes precedence for conflicts)
   - **Preferences**: Merges sort preferences (server takes precedence)

4. **Result**: localStorage now contains the complete merged dataset from both local and server

## What Happens When You Sign Out

- ✅ **localStorage data is kept** (you can continue using the app)
- ✅ Sync stops (no more updates to server)
- ✅ If you sign in with a different account later, data will merge again

## Example Scenarios

### Scenario 1: First Time Sign In
- You have 5 favorites locally
- You sign in with a new account (no server data)
- Result: Your 5 favorites are uploaded to server, localStorage stays the same

### Scenario 2: Sign In with Existing Account
- You have 3 favorites locally (Podcast A, B, C)
- Server has 2 favorites (Podcast C, D) from another device
- Result: localStorage now has all 4 (A, B, C, D) - duplicates removed

### Scenario 3: Sign Out Then Sign In with Different Account
- You sign out (localStorage has 5 favorites)
- You sign in with a different account (server has 3 different favorites)
- Result: localStorage merges both = 8 favorites total

### Scenario 4: Switch Devices
- Device 1: You favorite Podcast A, sign in (syncs to server)
- Device 2: You favorite Podcast B, sign in (syncs to server)
- Device 1: Refresh page, now has both A and B
- Device 2: Refresh page, now has both A and B

## Key Points

1. **localStorage is always the source of truth** for what you see in the app
2. **When signed in**, localStorage syncs with server (two-way)
3. **When signed out**, localStorage is independent
4. **Merging is smart**: Removes duplicates, keeps most recent data
5. **No data loss**: Everything merges, nothing gets deleted

## If You Want to Clear Data

- Sign out first
- Clear browser localStorage manually (or use browser's clear data feature)
- Sign in again to start fresh

## Technical Details

- **Sync triggers**: Sign in, page load (if signed in), any data change (debounced 2s)
- **Merge strategy**: Server is source of truth for conflicts, but arrays are combined
- **Offline support**: App works fully offline, syncs when back online

