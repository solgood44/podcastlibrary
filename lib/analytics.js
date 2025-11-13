// Google Analytics 4 Event Tracking Utility
// This module provides a centralized way to track user interactions

// Check if gtag is available
function isGtagAvailable() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

// Track page views (for SPA navigation)
export function trackPageView(pageName, pagePath) {
  if (!isGtagAvailable()) return;
  
  window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-9CDHCMHT8J', {
    page_path: pagePath || window.location.pathname,
    page_title: pageName,
  });
  
  // Also send as event for better tracking
  window.gtag('event', 'page_view', {
    page_title: pageName,
    page_path: pagePath || window.location.pathname,
    page_location: window.location.href,
  });
}

// Track episode playback events
export function trackEpisodePlay(episode, podcast) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'episode_play', {
    episode_id: episode.id,
    episode_title: episode.title || 'Unknown',
    podcast_id: podcast?.id,
    podcast_title: podcast?.title || 'Unknown',
    podcast_author: podcast?.author || 'Unknown',
    episode_duration: episode.duration_seconds || 0,
    episode_date: episode.pub_date || null,
  });
}

export function trackEpisodePause(episode, podcast, currentTime, duration) {
  if (!isGtagAvailable()) return;
  
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  window.gtag('event', 'episode_pause', {
    episode_id: episode.id,
    episode_title: episode.title || 'Unknown',
    podcast_id: podcast?.id,
    podcast_title: podcast?.title || 'Unknown',
    progress_percent: Math.round(progressPercent),
    progress_seconds: Math.round(currentTime),
  });
}

export function trackEpisodeEnd(episode, podcast, duration) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'episode_complete', {
    episode_id: episode.id,
    episode_title: episode.title || 'Unknown',
    podcast_id: podcast?.id,
    podcast_title: podcast?.title || 'Unknown',
    episode_duration: duration || 0,
  });
}

export function trackEpisodeSeek(episode, fromTime, toTime, duration) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'episode_seek', {
    episode_id: episode.id,
    from_time: Math.round(fromTime),
    to_time: Math.round(toTime),
    seek_duration: Math.round(toTime - fromTime),
    episode_duration: duration || 0,
  });
}

// Track podcast views
export function trackPodcastView(podcast) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'view_podcast', {
    podcast_id: podcast.id,
    podcast_title: podcast.title || 'Unknown',
    podcast_author: podcast.author || 'Unknown',
    podcast_genre: Array.isArray(podcast.genre) 
      ? podcast.genre.join(', ') 
      : podcast.genre || 'Unknown',
    episode_count: podcast.episode_count || 0,
  });
}

// Track author views
export function trackAuthorView(authorName, podcastCount) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'view_author', {
    author_name: authorName,
    podcast_count: podcastCount || 0,
  });
}

// Track search events
export function trackSearch(query, searchMode, resultCount) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'search', {
    search_term: query,
    search_mode: searchMode, // 'episodes' or 'podcasts'
    result_count: resultCount || 0,
  });
}

// Track favorite actions
export function trackFavoritePodcast(podcast, isFavorite) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', isFavorite ? 'add_favorite_podcast' : 'remove_favorite_podcast', {
    podcast_id: podcast.id,
    podcast_title: podcast.title || 'Unknown',
    podcast_author: podcast.author || 'Unknown',
  });
}

export function trackFavoriteEpisode(episode, podcast, isFavorite) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', isFavorite ? 'add_favorite_episode' : 'remove_favorite_episode', {
    episode_id: episode.id,
    episode_title: episode.title || 'Unknown',
    podcast_id: podcast?.id,
    podcast_title: podcast?.title || 'Unknown',
  });
}

export function trackFavoriteAuthor(authorName, isFavorite) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', isFavorite ? 'add_favorite_author' : 'remove_favorite_author', {
    author_name: authorName,
  });
}

// Track category views
export function trackCategoryView(category) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'view_category', {
    category_name: category,
  });
}

// Track view mode changes
export function trackViewModeChange(mode) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'change_view_mode', {
    view_mode: mode, // 'grid' or 'list'
  });
}

// Track filter/sort changes
export function trackFilterChange(filterType, filterValue) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'change_filter', {
    filter_type: filterType, // 'duration', 'sort', etc.
    filter_value: filterValue,
  });
}

// Track user engagement (time on page, scroll depth, etc.)
export function trackEngagementTime(timeInSeconds, pageName) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'user_engagement', {
    engagement_time_msec: timeInSeconds * 1000,
    page_title: pageName,
  });
}

// Track error events
export function trackError(errorType, errorMessage, errorLocation) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'exception', {
    description: errorMessage,
    fatal: false,
    error_type: errorType,
    error_location: errorLocation,
  });
}

// Track external link clicks
export function trackExternalLink(url) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'click', {
    event_category: 'outbound',
    event_label: url,
    transport_type: 'beacon',
  });
}

// Track audio player interactions
export function trackAudioPlayerAction(action, episode, podcast) {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'audio_player_action', {
    action: action, // 'play', 'pause', 'seek', 'volume_change', etc.
    episode_id: episode?.id,
    podcast_id: podcast?.id,
  });
}

// Track episode progress milestones (25%, 50%, 75%, 90%)
let progressMilestones = new Set();

export function trackEpisodeProgress(episode, currentTime, duration) {
  if (!isGtagAvailable() || !duration || duration === 0) return;
  
  const percent = (currentTime / duration) * 100;
  const milestoneKey = `${episode.id}_${Math.floor(percent / 25) * 25}`;
  
  // Track milestones: 25%, 50%, 75%, 90%
  const milestones = [25, 50, 75, 90];
  
  milestones.forEach(milestone => {
    if (percent >= milestone && !progressMilestones.has(`${episode.id}_${milestone}`)) {
      progressMilestones.add(`${episode.id}_${milestone}`);
      
      window.gtag('event', 'episode_progress', {
        episode_id: episode.id,
        episode_title: episode.title || 'Unknown',
        podcast_id: episode.podcast_id,
        progress_percent: milestone,
        progress_seconds: Math.round((milestone / 100) * duration),
      });
    }
  });
}

// Reset progress tracking for a new episode
export function resetEpisodeProgress(episodeId) {
  // Remove all milestones for this episode
  const keysToRemove = [];
  progressMilestones.forEach(key => {
    if (key.startsWith(`${episodeId}_`)) {
      keysToRemove.push(key);
    }
  });
  keysToRemove.forEach(key => progressMilestones.delete(key));
}

// Track session start
export function trackSessionStart() {
  if (!isGtagAvailable()) return;
  
  window.gtag('event', 'session_start', {
    timestamp: new Date().toISOString(),
  });
}






