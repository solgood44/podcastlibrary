# Google Analytics Setup Guide

This guide covers the complete Google Analytics 4 (GA4) setup for your podcast website, including what to track and how to get the most value from your analytics data.

## ⚡ Quick Start

**The tracking code is already working!** Events are being sent to GA4 right now. 

**For a quick 15-minute setup checklist, see:** [`GA4_QUICK_SETUP.md`](./GA4_QUICK_SETUP.md)

## What's Automated vs Manual

### ✅ Already Automated (Working Now)
- ✅ All event tracking code is implemented
- ✅ Events are automatically sent to GA4
- ✅ Page views, episode plays, searches, favorites - all tracked
- ✅ No code changes needed

### 📋 Manual Setup Required (15-20 minutes)
- Custom dimensions (in GA4 web interface)
- Marking events as conversions (in GA4 web interface)  
- Creating custom reports (optional, in GA4 web interface)

**Note:** Google doesn't provide APIs for these admin tasks, so they must be done in the GA4 web interface. But it's quick and straightforward!

## Overview

Your site now has comprehensive Google Analytics tracking implemented. This includes:
- Basic page view tracking
- Custom event tracking for user interactions
- Audio playback engagement metrics
- Search behavior tracking
- User engagement patterns

## What's Already Implemented

### 1. Basic Setup
- ✅ GA4 script loaded in `pages/_app.js` (Next.js pages)
- ✅ Analytics utility module at `lib/analytics.js` (for Next.js) and `web/analytics.js` (for SPA)
- ✅ Event tracking integrated into key user interactions

### 2. Tracked Events

#### Page Views
- Library/Grid view
- Podcast detail pages
- Episode detail pages
- Author pages
- Search pages
- History, Favorites, Categories

#### Audio Playback
- `episode_play` - When user starts playing an episode
- `episode_pause` - When user pauses (includes progress %)
- `episode_complete` - When episode finishes
- `episode_seek` - When user seeks to different position
- `episode_progress` - Milestones at 25%, 50%, 75%, 90%

#### User Actions
- `view_podcast` - When user views a podcast's episode list
- `view_author` - When user views an author's page
- `search` - Search queries with results count
- `add_favorite_podcast` / `remove_favorite_podcast`
- `add_favorite_episode` / `remove_favorite_episode`
- `add_favorite_author` / `remove_favorite_author`
- `view_category` - Category browsing

#### Navigation
- `change_view_mode` - Grid vs List view
- `change_filter` - Filter/sort changes

## Key Metrics to Track

### 1. User Engagement Metrics

**What to Monitor:**
- **Session Duration**: How long users stay on your site
- **Pages per Session**: How many pages users visit
- **Bounce Rate**: Percentage of single-page sessions
- **Returning Users**: Users who come back

**Why It Matters:**
- High engagement = users finding value
- Low bounce rate = good content discovery
- Returning users = loyal audience

### 2. Content Performance

**What to Monitor:**
- **Most Viewed Podcasts**: Which podcasts get the most attention
- **Most Played Episodes**: Which episodes are most popular
- **Episode Completion Rate**: % of episodes played to completion
- **Average Listen Time**: How long users listen per session

**Why It Matters:**
- Identifies popular content to feature
- Shows what content resonates
- Helps prioritize content curation

### 3. Search Behavior

**What to Monitor:**
- **Search Terms**: What users are searching for
- **Search Result Clicks**: Which results get clicked
- **Zero Result Searches**: Searches with no results

**Why It Matters:**
- Identifies content gaps
- Shows user intent
- Helps improve search functionality

### 4. Audio Engagement

**What to Monitor:**
- **Play Rate**: % of episodes that get played
- **Completion Rate**: % of episodes played to completion
- **Average Listen Duration**: How long users listen
- **Seek Patterns**: Where users skip/rewind

**Why It Matters:**
- Measures content quality
- Identifies engaging episodes
- Shows user preferences

### 5. User Journey

**What to Monitor:**
- **Entry Points**: Where users land first
- **Navigation Paths**: How users move through the site
- **Exit Points**: Where users leave
- **Conversion Funnels**: Library → Podcast → Episode → Play

**Why It Matters:**
- Optimizes user flow
- Identifies friction points
- Improves content discovery

## Setting Up Custom Dimensions

To get even more value from your analytics, set up these custom dimensions in GA4:

### 1. Go to GA4 Admin → Custom Definitions → Custom Dimensions

### 2. Create These Dimensions:

**Dimension 1: User Type**
- Scope: User
- Description: Whether user is authenticated or guest
- Values: 'guest', 'authenticated'

**Dimension 2: Content Type**
- Scope: Event
- Description: Type of content viewed
- Values: 'podcast', 'episode', 'author', 'category'

**Dimension 3: Podcast Genre**
- Scope: Event
- Description: Genre of podcast being viewed/played
- Values: Array of genres

**Dimension 4: Episode Duration**
- Scope: Event
- Description: Duration category of episode
- Values: 'under10', '10-30', '30-60', '60plus'

## Creating Custom Reports

### 1. Episode Performance Report

**Metrics:**
- Total plays
- Completion rate
- Average listen time
- Unique listeners

**Dimensions:**
- Episode title
- Podcast title
- Episode date
- Duration category

**Use Case:** Identify top-performing episodes and content patterns

### 2. Podcast Engagement Report

**Metrics:**
- Total views
- Episodes played
- Average episodes per podcast
- Favorite count

**Dimensions:**
- Podcast title
- Author
- Genre
- Episode count

**Use Case:** Understand which podcasts drive the most engagement

### 3. User Behavior Funnel

**Steps:**
1. Library view
2. Podcast view
3. Episode play
4. Episode completion

**Use Case:** Identify where users drop off in the listening journey

### 4. Search Analysis Report

**Metrics:**
- Total searches
- Results found
- Click-through rate
- Zero-result searches

**Dimensions:**
- Search term
- Search mode (episodes/podcasts)
- Result count

**Use Case:** Improve search functionality and identify content gaps

## Setting Up Goals/Conversions

### Recommended Conversions:

1. **Episode Play** (`episode_play` event)
   - Value: Engagement indicator
   - Mark as conversion in GA4

2. **Episode Completion** (`episode_complete` event)
   - Value: High engagement indicator
   - Mark as conversion in GA4

3. **Favorite Added** (`add_favorite_*` events)
   - Value: User retention indicator
   - Mark as conversion in GA4

4. **Search with Results** (`search` event with result_count > 0)
   - Value: Content discovery success
   - Mark as conversion in GA4

## Advanced Analytics Features

### 1. Audience Segmentation

Create segments for:
- **New vs Returning Users**
- **High Engagement Users** (complete >5 episodes)
- **Power Users** (favorite >10 items)
- **Mobile vs Desktop Users**

### 2. Custom Events Analysis

Use the Events report to analyze:
- Which episodes get the most plays
- Which podcasts have highest completion rates
- Search patterns and trends
- Favorite patterns

### 3. User Explorer

Use User Explorer to:
- See individual user journeys
- Identify power users
- Understand user behavior patterns

### 4. Real-Time Reports

Monitor:
- Current active users
- Live episode plays
- Real-time search queries
- Current page views

## Key Reports to Check Regularly

### Daily
- Real-time active users
- Today's episode plays
- Current search queries

### Weekly
- Top podcasts by views
- Top episodes by plays
- Search term analysis
- User engagement trends

### Monthly
- Overall traffic trends
- Content performance summary
- User retention metrics
- Conversion rates
- Popular genres/authors

## Privacy Considerations

### Current Settings
- ✅ IP anonymization enabled
- ✅ Google Signals disabled (no demographic data)
- ✅ Ad personalization disabled

### GDPR/Privacy Compliance
- Consider adding cookie consent banner
- Update privacy policy to mention analytics
- Provide opt-out mechanism if required

## Troubleshooting

### Events Not Showing Up

1. **Check GA4 Measurement ID**
   - Verify `G-9CDHCMHT8J` is correct
   - Or set `NEXT_PUBLIC_GA_MEASUREMENT_ID` environment variable

2. **Check Browser Console**
   - Look for `gtag` errors
   - Verify analytics.js is loading

3. **Check GA4 DebugView**
   - Enable debug mode in GA4
   - Use GA Debugger Chrome extension

4. **Verify Event Names**
   - Check that events match exactly
   - Use GA4's Event Builder to test

### Data Not Appearing

- GA4 has a 24-48 hour delay for some reports
- Real-time reports show immediately
- Check date range in reports
- Verify filters aren't excluding data

## Next Steps

1. **Set up Custom Dimensions** (see above)
2. **Create Custom Reports** (see above)
3. **Set up Conversions** (see above)
4. **Configure Alerts** for:
   - Traffic spikes/drops
   - Error rate increases
   - Conversion rate changes

5. **Regular Review Schedule:**
   - Weekly: Engagement metrics
   - Monthly: Content performance
   - Quarterly: Strategy review

## Environment Variables

To use a different GA4 Measurement ID, set:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-YOUR-ID-HERE
```

This will be used in both Next.js pages and can be configured for the SPA as well.

## Additional Resources

- [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [GA4 Events Reference](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [GA4 Custom Dimensions](https://support.google.com/analytics/answer/10075209)

## Summary

Your podcast website now has comprehensive analytics tracking that will help you:

1. **Understand Your Audience**: Who uses your site and how
2. **Optimize Content**: What podcasts/episodes perform best
3. **Improve UX**: Where users struggle or drop off
4. **Measure Success**: Track key engagement metrics
5. **Make Data-Driven Decisions**: Use insights to grow your platform

The tracking is already implemented and will start collecting data immediately. Focus on setting up custom reports and regularly reviewing the data to get actionable insights.

