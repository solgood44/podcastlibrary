// Main application logic

let podcasts = [];
let allEpisodes = []; // Cache all episodes for search
let currentPodcast = null;
let audioPlayer = null;
let currentEpisode = null; // The episode that is currently playing (if any)
let displayedEpisode = null; // The episode being viewed on detail page
let isPlaying = false;
let currentPage = 'grid';
let episodesCache = {}; // Cache episodes by podcast ID
let categories = []; // All unique categories
let currentCategory = null; // Currently viewed category
let authors = []; // All unique authors
let currentAuthor = null; // Currently viewed author
let authorsSortMode = 'count-desc'; // 'count-desc' or 'name-asc' for authors page
let authorsViewMode = 'list'; // 'grid' or 'list' for authors page
let authorDescriptions = {}; // Cache for author descriptions (will be loaded from API later)
let searchMode = 'podcasts'; // default to home (category rows); 'episodes' still used in search modal
let viewMode = 'grid'; // 'grid' or 'list'
let sortMode = 'title-asc'; // 'title-asc', 'title-desc'
let durationFilter = 'all'; // 'all', 'under10', '10-30', '30-60', '60plus'
let episodesSortMode = 'title-asc'; // 'title-asc', 'title-desc', 'date-desc', 'date-asc'
let episodesDurationFilter = 'all'; // 'all', 'under10', '10-30', '30-60', '60plus'
let podcastEpisodesSortMode = 'date-desc'; // Sorting mode for podcast episodes page (default: newest first)
let podcastEpisodesDurationFilter = 'all'; // Duration filter for podcast episodes page
let podcastSortPreferences = {}; // Store sort preferences per podcast ID
let isSyncing = false; // Track if sync is in progress
let syncEnabled = false; // Track if user has enabled sync
let sounds = []; // All nature sounds
let soundsSortMode = 'title-asc'; // 'title-asc', 'title-desc'
let soundsViewMode = 'list'; // Always use list mode (grid removed)
let currentSound = null; // The sound that is currently playing (if any)
let soundAudioPlayer = null; // Separate audio player for sounds (for seamless looping)
let soundAudioContext = null; // Web Audio API context for seamless looping
let soundAudioSource = null; // Web Audio API source node
let soundAudioBuffer = null; // Cached audio buffer for seamless looping
let soundAudioPlayer2 = null; // Second HTML5 audio player for seamless crossfade looping
let soundLoopFadeInterval = null; // Interval for managing crossfade
let soundLoopCheckFunction = null; // Stored reference to loop check function for removal
let soundIsActuallyPlaying = false; // Track if sound is actually playing (to fix pause detection)
let sleepTimerInterval = null; // Interval for sleep timer countdown
let sleepTimerEndTime = null; // Timestamp when sleep timer will end
let sleepTimerMinutes = 0; // Current sleep timer duration in minutes
let playbackSpeed = 1.0; // Playback speed (0.5x, 1x, 1.25x, 1.5x, 2x)
let volume = 1.0; // Volume (0.0 to 1.0)

// Progress tracking key for localStorage
const PROGRESS_KEY = 'podcast_progress';
const HISTORY_KEY = 'episode_history';
const FAVORITES_KEY = 'podcast_favorites';
const PODCAST_SORT_PREFERENCES_KEY = 'podcast_sort_preferences';
const USER_VISIBLE_CATEGORIES_KEY = 'user_visible_categories';
const QUEUE_KEY = 'episode_queue';
const AUTO_PLAY_KEY = 'auto_play_enabled';
const ONBOARDING_KEY = 'onboarding_completed';
const PLAYBACK_SPEED_KEY = 'playback_speed';
const VOLUME_KEY = 'volume';
const MAX_HISTORY = 50;

// User-selected categories for Library (logged-in only). null = show all.
let userVisibleCategories = null;

// Queue management
let episodeQueue = [];
let autoPlayEnabled = true; // Auto-play next episode by default

// Authors to exclude from the authors list
const EXCLUDED_AUTHORS = [
    'solgoodmedia',
    'solgoodmedia.com',
    'sol good network',
    'sol good media',
    'solgood media',
    'sol goodmedia',
    'public domain',
    'publicdomain',
    'audiobooks'
].map(a => a.toLowerCase());

// Function to check if an author should be excluded (handles variations)
function shouldExcludeAuthor(author) {
    if (!author) return true;
    const authorLower = author.toLowerCase().trim();
    
    // Exclude authors containing ".com"
    if (authorLower.includes('.com')) {
        return true;
    }
    
    // Direct match
    if (EXCLUDED_AUTHORS.includes(authorLower)) {
        return true;
    }
    
    // Partial match for "sol good" variations
    if (authorLower.includes('sol good') || authorLower.includes('solgood')) {
        return true;
    }
    
    // Check for "public domain" variations
    if (authorLower.includes('public domain') || authorLower.includes('publicdomain')) {
        return true;
    }
    
    return false;
}

// Generate URL-friendly slug from title
function generateSlug(title) {
    if (!title) return '';
    
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Audio prefetching cache
const prefetchedAudio = new Set();
const prefetchAudioLink = new Map(); // Map of episode ID to link element

// Prefetch audio for an episode (loads metadata and starts buffering)
function prefetchEpisodeAudio(episode) {
    // EMERGENCY MODE: Disable audio prefetching to halt egress
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
        return;
    }
    if (!episode || !episode.audio_url || prefetchedAudio.has(episode.id)) {
        return;
    }
    
    // Mark as prefetched
    prefetchedAudio.add(episode.id);
    
    // Create a link element for prefetching
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'audio';
    link.href = episode.audio_url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    prefetchAudioLink.set(episode.id, link);
    
    // Also create a hidden audio element to start buffering
    // This is more aggressive but ensures faster playback
    const hiddenAudio = document.createElement('audio');
    hiddenAudio.preload = 'metadata';
    hiddenAudio.src = episode.audio_url;
    hiddenAudio.crossOrigin = 'anonymous';
    hiddenAudio.style.display = 'none';
    document.body.appendChild(hiddenAudio);
    
    // Clean up after a delay if not used
    setTimeout(() => {
        if (audioPlayer?.src !== episode.audio_url) {
            hiddenAudio.remove();
        }
    }, 30000); // Keep for 30 seconds
}

// Setup audio prefetching on episode hover/visibility
function setupAudioPrefetching() {
    // EMERGENCY MODE: Disable audio prefetching to halt egress
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
        console.warn('[EGRESS HALT] Audio prefetching disabled');
        return;
    }
    // Use event delegation for hover events on episode items
    document.addEventListener('mouseenter', (e) => {
        // e.target might be a text node or other non-Element, so we need to get the Element
        let target = e.target;
        
        // If target is not an Element, try to get the parent Element
        if (!target || !(target instanceof Element)) {
            target = target?.parentElement || target?.parentNode;
        }
        
        // Final check - ensure we have a valid Element with closest method
        if (!target || !(target instanceof Element) || typeof target.closest !== 'function') {
            return;
        }
        
        const episodeItem = target.closest('.episode-item');
        if (episodeItem) {
            // Find the episode data from the onclick handler or data attribute
            const playBtn = episodeItem.querySelector('.btn-episode-play');
            if (playBtn && playBtn.onclick) {
                // Try to extract episode from onclick handler
                // This is a bit hacky, but we can add data attributes instead
                const episodeId = episodeItem.querySelector('.episode-play-icon')?.getAttribute('data-episode-id');
                if (episodeId) {
                    const episode = allEpisodes.find(ep => ep.id === episodeId);
                    if (episode) {
                        prefetchEpisodeAudio(episode);
                    }
                }
            }
        }
    }, true);
    
    // Also prefetch episodes that are visible in viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const episodeItem = entry.target;
                const episodeId = episodeItem.querySelector('.episode-play-icon')?.getAttribute('data-episode-id');
                if (episodeId) {
                    const episode = allEpisodes.find(ep => ep.id === episodeId);
                    if (episode) {
                        prefetchEpisodeAudio(episode);
                    }
                }
            }
        });
    }, {
        rootMargin: '100px' // Start prefetching 100px before episode is visible
    });
    
    // Observe episode items when they're added to DOM
    const observeEpisodeItems = () => {
        document.querySelectorAll('.episode-item').forEach(item => {
            observer.observe(item);
        });
    };
    
    // Observe initially and after DOM updates
    observeEpisodeItems();
    
    // Re-observe after episodes are loaded (they're loaded dynamically)
    // Use MutationObserver to watch for episode items being added
    const mutationObserver = new MutationObserver(() => {
        observeEpisodeItems();
    });
    
    // Start observing after a short delay to let initial page load
    setTimeout(() => {
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }, 500);
}

// Restore visible categories from localStorage (so Library respects saved preferences on load)
function restoreUserVisibleCategories() {
    try {
        const stored = localStorage.getItem(USER_VISIBLE_CATEGORIES_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            userVisibleCategories = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
        } else {
            userVisibleCategories = null;
        }
    } catch (e) {
        userVisibleCategories = null;
    }
}

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    restoreUserVisibleCategories();
    audioPlayer = document.getElementById('audio-player');
    setupAudioPlayer();
    setupRouting();
    // Initialize sleep timer UI to show sidebar timer
    updateSleepTimerUI();
    setupAuth(); // Initialize authentication
    setupAudioPrefetching(); // Setup audio prefetching
    // Set initial search mode based on default page (grid = podcasts)
    setSearchMode('podcasts');
    loadPodcasts().then(() => {
        // After podcasts load, check URL params for episode/podcast links
        handleURLParams();
    });
    restoreProgress(); // Restore any saved progress
    restorePodcastSortPreferences(); // Restore podcast sort preferences
    restoreQueue(); // Restore episode queue
    restoreAutoPlaySetting(); // Restore auto-play setting
    restorePlaybackSettings(); // Restore playback speed and volume
    renderSidebar();
    
    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        const speedMenu = document.getElementById('playback-speed-menu');
        const volumeControl = document.getElementById('volume-control');
        const speedBtn = document.getElementById('playback-speed-btn');
        const volumeBtn = document.getElementById('volume-btn');
        
        if (speedMenu && !speedMenu.contains(e.target) && !speedBtn?.contains(e.target)) {
            closePlaybackSpeedMenu();
        }
        if (volumeControl && !volumeControl.contains(e.target) && !volumeBtn?.contains(e.target)) {
            closeVolumeControl();
        }
    });
    
    // Handle window resize to manage sidebar state
    window.addEventListener('resize', handleResize);
    
    // Handle page visibility changes (e.g., screen lock, tab switch)
    document.addEventListener('visibilitychange', () => {
        if (currentSound) {
            if (document.hidden) {
                // Page became hidden (phone locked, tab switched) - try to keep audio playing
                if (soundAudioContext && soundAudioContext.state === 'suspended') {
                    soundAudioContext.resume().then(() => {
                        if (!soundAudioSource || !soundAudioSource.buffer) {
                            startSeamlessLoop();
                        }
                    }).catch(err => {
                        console.log('Error resuming when hidden:', err);
                    });
                }
                // Also ensure HTML5 audio keeps playing if using fallback
                if (soundAudioPlayer && soundAudioPlayer.paused && !soundAudioSource) {
                    soundAudioPlayer.play().catch(err => {
                        console.log('Error resuming HTML5 audio when hidden:', err);
                    });
                }
            } else {
                // Page became visible - resume audio if it was playing
                if (soundAudioContext && soundAudioContext.state === 'suspended') {
                    soundAudioContext.resume().then(() => {
                        // If source was stopped, restart it
                        if (!soundAudioSource || !soundAudioSource.buffer) {
                            startSeamlessLoop();
                        }
                    }).catch(err => {
                        console.log('Error resuming after visibility change:', err);
                    });
                } else if (soundAudioPlayer && soundAudioPlayer.paused && currentSound) {
                    // Try to resume HTML5 audio if using fallback
                    if (!soundAudioSource) {
                        soundAudioPlayer.play().catch(err => {
                            console.log('Error resuming HTML5 audio:', err);
                        });
                    }
                }
            }
        }
    });
    
    // Also handle page focus/blur events for additional background playback support
    window.addEventListener('blur', () => {
        if (currentSound && soundAudioContext && soundAudioContext.state === 'suspended') {
            soundAudioContext.resume().catch(err => {
                console.log('Error resuming on blur:', err);
            });
        }
    });
    
    window.addEventListener('focus', () => {
        if (currentSound && soundAudioContext && soundAudioContext.state === 'suspended') {
            soundAudioContext.resume().then(() => {
                if (!soundAudioSource || !soundAudioSource.buffer) {
                    startSeamlessLoop();
                }
            }).catch(err => {
                console.log('Error resuming on focus:', err);
            });
        }
    });
    
    // Set initial sidebar state based on screen size and user preference
    const sidebar = document.getElementById('sidebar');
    const body = document.body;
    if (!isMobileScreen()) {
        // On desktop, check if user previously closed sidebar
        const sidebarClosed = localStorage.getItem('sidebar-closed');
        if (!sidebarClosed) {
            sidebar.classList.add('open');
            body.classList.remove('sidebar-closed');
        } else {
            body.classList.add('sidebar-closed');
        }
    } else {
        // On mobile, sidebar starts closed
        if (!sidebar.classList.contains('open')) {
            body.classList.add('sidebar-closed');
        } else {
            body.classList.remove('sidebar-closed');
        }
    }
    handleResize();
    
    // Check if player bar is already visible on page load
    const playerBar = document.getElementById('player-bar');
    if (playerBar && !playerBar.classList.contains('hidden')) {
        document.body.classList.add('player-bar-visible');
    }
});

// Handle window resize to adjust sidebar behavior
function handleResize() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    if (isMobileScreen()) {
        // On mobile, automatically close sidebar when screen is small or shrunk
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
            body.classList.add('sidebar-closed');
        } else {
            overlay.classList.add('hidden');
            body.classList.add('sidebar-closed');
        }
    } else {
        // On desktop, ensure overlay is always hidden
        // Sidebar defaults to open via CSS, but user can close it if they want
        overlay.classList.add('hidden');
        // If sidebar doesn't have open class, add it (on desktop, it should be open by default)
        if (!sidebar.classList.contains('open') && !localStorage.getItem('sidebar-closed')) {
            sidebar.classList.add('open');
            body.classList.remove('sidebar-closed');
        } else if (!sidebar.classList.contains('open')) {
            body.classList.add('sidebar-closed');
        } else {
            body.classList.remove('sidebar-closed');
        }
    }
}

// Check if we're on mobile/small screen
function isMobileScreen() {
    return window.innerWidth <= 768;
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    if (isMobileScreen()) {
        // On mobile, sidebar toggle works as before
        sidebar.classList.toggle('open');
        overlay.classList.toggle('hidden');
        // Update body class for mobile
        if (sidebar.classList.contains('open')) {
            body.classList.remove('sidebar-closed');
        } else {
            body.classList.add('sidebar-closed');
        }
    } else {
        // On desktop, user can still close sidebar if they want
        sidebar.classList.toggle('open');
        // Update body class to adjust layout
        if (sidebar.classList.contains('open')) {
            body.classList.remove('sidebar-closed');
            localStorage.removeItem('sidebar-closed');
        } else {
            body.classList.add('sidebar-closed');
            localStorage.setItem('sidebar-closed', 'true');
        }
        // Overlay is not needed on desktop (sidebar slides in/out without overlay)
        overlay.classList.add('hidden');
    }
}

// Simple routing
function setupRouting() {
    // Land on Library (category rows + Browse All) as the home screen
    navigateTo('grid', 'library');
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', (event) => {
        const path = window.location.pathname;
        
        // Handle /podcast/[slug] paths
        const podcastMatch = path.match(/^\/podcast\/([^\/]+)/);
        if (podcastMatch) {
            const slug = podcastMatch[1];
            const podcast = podcasts.find(p => generateSlug(p.title || '') === slug);
            if (podcast) {
                currentPodcast = podcast;
                navigateTo('episodes');
                loadEpisodesPage();
                return;
            }
        }
        
        // Handle /author/[slug] paths
        const authorMatch = path.match(/^\/author\/([^\/]+)/);
        if (authorMatch) {
            const slug = authorMatch[1];
            // Find author by matching slug
            if (authors.length === 0) {
                extractAuthors();
            }
            const author = authors.find(a => generateSlug(a) === slug);
            if (author) {
                showAuthorPage(author);
                return;
            }
        }
        
        // Handle /web/ root path - go to Library (home screen)
        if (path === '/web/' || path === '/web' || path === '/') {
            navigateTo('grid', 'library');
            currentPodcast = null;
            return;
        }
    });
    
    // Note: Initial URL path check is handled in handleURLParams() after podcasts load
}

function navigateTo(page, param = null) {
    showPage(page);
    
    // Track page view
    if (window.analytics) {
        const pageName = page === 'grid' ? 'Library' : 
                        page === 'episodes' ? 'Podcast Episodes' :
                        page === 'player' ? 'Player' :
                        page === 'search' ? 'Search' :
                        page === 'category' ? `Category: ${param || ''}` :
                        page === 'authors' ? 'Authors' :
                        page === 'author' ? `Author: ${param || ''}` :
        page === 'recent' ? 'Recently Listened To' :
        page === 'history' || page === 'queue' ? 'Recently Listened To' :
                        page === 'favorites' ? 'Favorites' :
                        page === 'sounds' ? 'Sounds' :
                        page === 'sound' ? 'Sound Detail' :
                        page === 'episode' ? 'Episode Detail' :
                        page === 'all-episodes' ? 'All Episodes' :
                        page;
        window.analytics.trackPageView(pageName, `/${page}${param ? '/' + param : ''}`);
    }
    
    // Close sidebar only on mobile
    if (isMobileScreen()) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
    }
    
    // Update active sidebar item
    updateActiveSidebarItem(page, param);
    
    // Load page-specific content
    if (page === 'grid') {
        // Library is the home page: category rows + Browse All grid for both Home and Library
        if (window.location.pathname !== '/web/' && window.location.pathname !== '/web') {
            window.history.pushState({ page: 'grid', param }, '', '/web/');
        }
        currentPodcast = null; // Clear current podcast when going to grid
        if (searchMode !== 'podcasts') {
            setSearchMode('podcasts');
        }
        currentCategory = null; // Reset category when going home
        const containerEl = document.getElementById('podcast-container');
        if (podcasts.length > 0) {
            if (containerEl) containerEl.classList.remove('hidden');
            // Library: Recently Listened To, Top 10 today, category rows, Browse All
            renderLibraryWithCategoryRows();
        } else if (podcasts.length === 0 && allEpisodes.length === 0) {
            // If no podcasts loaded yet, trigger load
            loadPodcasts();
        }
    } else if (page === 'all-episodes') {
        // Set search mode to episodes when viewing all episodes
        if (searchMode !== 'episodes') {
            setSearchMode('episodes');
        }
        loadAllEpisodesPage();
    } else if (page === 'episodes' && currentPodcast) {
        loadEpisodesPage();
    } else if (page === 'player') {
        loadPlayerPage();
    } else if (page === 'search') {
        const topSearchInput = document.getElementById('top-search-input');
        const titleEl = document.getElementById('search-page-title');
        if (topSearchInput) {
            topSearchInput.focus();
            // If there's a value, trigger search
            if (topSearchInput.value.trim()) {
                handleSearch(topSearchInput.value);
                if (titleEl) titleEl.textContent = 'Search Results';
            } else {
                // Show all items based on mode
                if (searchMode === 'podcasts') {
                    navigateTo('grid');
                } else {
                    navigateTo('all-episodes');
                }
            }
        }
    } else if (page === 'category' && param) {
        showCategoryPage(param);
    } else if (page === 'authors') {
        loadAuthorsPage();
    } else if (page === 'author' && param) {
        showAuthorPage(param);
    } else if (page === 'recent' || page === 'history' || page === 'queue') {
        loadRecentlyListenedPage();
    } else if (page === 'favorites') {
        loadFavoritesPage();
    } else if (page === 'sounds') {
        loadSoundsPage();
    } else if (page === 'sound') {
        loadSoundDetailPage();
    } else if (page === 'episode') {
        // If navigating to episode page and we have a playing episode, show it
        // Otherwise, displayedEpisode should already be set by openEpisodeDetail()
        if (currentEpisode && !displayedEpisode) {
            displayedEpisode = currentEpisode;
            // Also set currentPodcast if we don't have it
            if (!currentPodcast && currentEpisode.podcast_id) {
                currentPodcast = podcasts.find(p => p.id === currentEpisode.podcast_id);
            }
        }
        if (displayedEpisode && currentPodcast) {
            loadEpisodeDetailPage();
        }
    }
}

function showPage(page) {
    if (page === 'history' || page === 'queue') page = 'recent';
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
        pageEl.classList.remove('hidden');
        
        // Load page-specific content
        if (page === 'sounds') {
            loadSoundsPage();
        } else if (page === 'episodes' && currentPodcast) {
            loadEpisodesPage();
        } else if (page === 'player') {
            loadPlayerPage();
        }
    }
    updatePageTitle(page);
}

// Update page title and meta tags based on current page
function updatePageTitle(page) {
    const baseTitle = 'Podcast Library';
    let title = baseTitle;
    let description = 'Discover and listen to thousands of podcasts, audiobooks, and audio content.';
    let image = 'https://podcastlibrary.org/web/og-image.svg';
    let url = 'https://podcastlibrary.org' + window.location.pathname;
    
    if (page === 'episodes' && currentPodcast) {
        title = `${currentPodcast.title || 'Podcast'} - ${baseTitle}`;
        description = currentPodcast.description 
            ? sanitizeHtml(currentPodcast.description).substring(0, 200) + '...'
            : `Listen to ${currentPodcast.title || 'this podcast'}`;
        image = sanitizeImageUrl(currentPodcast.image_url) || image;
        url = `https://podcastlibrary.org/podcast/${generateSlug(currentPodcast.title || '')}`;
    } else if (page === 'author' && currentAuthor) {
        title = `${currentAuthor} - Author - ${baseTitle}`;
        description = authorDescriptions[currentAuthor] 
            ? sanitizeHtml(authorDescriptions[currentAuthor]).substring(0, 200) + '...'
            : `Explore podcasts by ${currentAuthor}`;
        url = `https://podcastlibrary.org/author/${generateSlug(currentAuthor)}`;
    } else if (page === 'episode' && displayedEpisode && currentPodcast) {
        title = `${displayedEpisode.title || 'Episode'} - ${currentPodcast.title || 'Podcast'} - ${baseTitle}`;
        description = displayedEpisode.description 
            ? sanitizeHtml(displayedEpisode.description).substring(0, 200) + '...'
            : `Listen to ${displayedEpisode.title || 'this episode'}`;
        image = sanitizeImageUrl(displayedEpisode.image_url) || sanitizeImageUrl(currentPodcast.image_url) || image;
        url = `https://podcastlibrary.org/podcast/${generateSlug(currentPodcast.title || '')}`;
    } else if (page === 'category' && currentCategory) {
        title = `${currentCategory} - ${baseTitle}`;
        description = `Browse podcasts in the ${currentCategory} category`;
    } else if (page === 'authors') {
        title = `Authors - ${baseTitle}`;
        description = 'Browse all podcast authors and discover their works';
    } else if (page === 'favorites') {
        title = `Favorites - ${baseTitle}`;
        description = 'Your favorite podcasts and episodes';
    } else if (page === 'sounds') {
        title = `Nature Sounds - ${baseTitle}`;
        description = 'Listen to seamless nature sound loops for relaxation and focus';
    } else if (page === 'sound' && currentSound) {
        title = `${currentSound.title || 'Nature Sound'} - ${baseTitle}`;
        description = currentSound.description || `Listen to ${currentSound.title || 'this nature sound'}`;
    } else if (page === 'recent' || page === 'history') {
        title = `Recently Listened To - ${baseTitle}`;
        description = 'Your recently played episodes';
    } else if (page === 'search') {
        title = `Search - ${baseTitle}`;
        description = 'Search for podcasts and episodes';
    }
    
    // Update document title
    document.title = title;
    
    // Update meta tags for social sharing
    // NOTE: Canonical tags are handled by Next.js pages (podcast/[slug], author/[slug], etc.)
    // and canonical tags should only be on the Next.js SEO pages
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    // Only set og:url for the base SPA, not for individual pages to avoid canonical conflicts
    if (page === 'grid' || page === 'authors' || page === 'favorites' || page === 'recent' || page === 'history' || page === 'search') {
        updateMetaTag('og:url', 'https://podcastlibrary.org/web/');
    } else {
        // For podcast/author pages, don't set og:url to avoid canonical conflicts
        // The Next.js pages handle canonical tags
    }
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    updateMetaTag('description', description);
}

// Helper function to update or create meta tags
function updateMetaTag(property, content) {
    // Handle both og: and twitter: properties
    let selector = '';
    if (property.startsWith('og:')) {
        selector = `meta[property="${property}"]`;
    } else if (property.startsWith('twitter:')) {
        selector = `meta[name="${property}"]`;
    } else {
        selector = `meta[name="${property}"]`;
    }
    
    let meta = document.querySelector(selector);
    if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
}

// Go back to library from episodes
function goBackToLibrary() {
    currentPodcast = null;
    window.history.pushState({ page: 'grid' }, '', '/web/');
    navigateTo('grid');
}

// Go back to episodes from player
function goBackToEpisode() {
    if (currentPodcast) {
        const slug = generateSlug(currentPodcast.title || '');
        window.history.pushState({ podcastId: currentPodcast.id, page: 'episodes' }, '', `/podcast/${slug}`);
        navigateTo('episodes');
    } else {
        window.history.pushState({ page: 'grid' }, '', '/web/');
        navigateTo('grid');
    }
}

// Load podcasts from API
async function loadPodcasts() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const emptyEl = document.getElementById('empty');
    const containerEl = document.getElementById('podcast-container');
    const controlsEl = document.getElementById('podcast-controls');
    
    let timeoutId;
    const safetyTimeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Loading is taking too long. The server may be slow or unreachable. Click Retry to try again.')), 10000);
    });
    
    try {
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (containerEl) containerEl.classList.add('hidden');
        if (controlsEl) controlsEl.classList.add('hidden');
        
        podcasts = await Promise.race([apiService.fetchPodcasts(), safetyTimeout]);
        clearTimeout(timeoutId);
        
        // Extract categories and authors
        extractCategories();
        extractAuthors();
        
        // Load author descriptions
        try {
            const descriptions = await apiService.fetchAuthorDescriptions();
            // Convert array to object for easy lookup
            authorDescriptions = {};
            descriptions.forEach(author => {
                if (author.name && author.description) {
                    authorDescriptions[author.name] = author.description;
                }
            });
        } catch (error) {
            console.warn('Could not load author descriptions:', error);
            // Continue without descriptions - they'll be loaded on-demand
        }
        
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (podcasts.length === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
        } else {
            // OPTIMIZED: Don't load all episodes on initial page load
            if (controlsEl) controlsEl.classList.remove('hidden');
            if (containerEl) containerEl.classList.remove('hidden');
            // If we're on the grid (Library) page, show category rows + Browse All; otherwise just update grid
            if (currentPage === 'grid') {
                renderLibraryWithCategoryRows();
            } else {
                renderPodcasts(podcasts);
            }
            updatePodcastCount();
            renderSidebar(); // Update sidebar with categories
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error loading podcasts:', error);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) {
            errorEl.classList.remove('hidden');
            const msgEl = document.getElementById('error-message');
            if (msgEl) msgEl.textContent = error.message || 'Failed to load podcasts. Check your Supabase configuration.';
            const hintEl = document.getElementById('error-hint');
            if (hintEl) hintEl.classList.remove('hidden');
        }
    }
}

// Extract unique categories from podcasts
function extractCategories() {
    const categorySet = new Set();
    podcasts.forEach(podcast => {
        if (podcast.genre && Array.isArray(podcast.genre)) {
            podcast.genre.forEach(genre => {
                if (genre && genre.trim()) {
                    categorySet.add(genre.trim());
                }
            });
        } else if (podcast.genre && typeof podcast.genre === 'string') {
            categorySet.add(podcast.genre.trim());
        }
    });
    
    // Add "Daily" category if any podcast has 200+ episodes
    const hasDailyPodcasts = podcasts.some(p => isDailyPodcast(p.id));
    if (hasDailyPodcasts) {
        categorySet.add('Daily');
    }
    
    categories = Array.from(categorySet).sort();
}

// Extract unique authors from podcasts (excluding specified ones)
function extractAuthors() {
    const authorSet = new Set();
    podcasts.forEach(podcast => {
        if (podcast.author && typeof podcast.author === 'string') {
            const author = podcast.author.trim();
            // Check if author should be excluded
            if (author && !shouldExcludeAuthor(author)) {
                authorSet.add(author);
            }
        }
    });
    
    authors = Array.from(authorSet).sort();
}

// Render sidebar
function renderSidebar() {
    renderRecentlyListenedCount();
    renderFavorites();
    renderAuthorsCount();
    renderCategories();
    updateActiveSidebarItem(currentPage);
}

// Update active sidebar item based on current page
function updateActiveSidebarItem(page = currentPage, pageParam = null) {
    // Remove active class from all items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Determine which sidebar item should be active
    let activeId = null;
    if (page === 'grid') {
        activeId = 'sidebar-item-library';
    } else if (page === 'recent' || page === 'history' || page === 'queue') {
        activeId = 'sidebar-item-recent';
    } else if (page === 'favorites') {
        activeId = 'sidebar-item-favorites';
    } else if (page === 'authors' || page === 'author') {
        activeId = 'sidebar-item-authors';
    }
    
    if (activeId) {
        const activeItem = document.getElementById(activeId);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

// Render recently listened count in sidebar
function renderRecentlyListenedCount() {
    const recentEl = document.getElementById('sidebar-recent-count');
    if (recentEl) {
        const recent = getRecentlyListenedEpisodes(500);
        recentEl.textContent = String(recent.length);
    }
}

// Render favorites in sidebar
function renderFavorites() {
    const favoritesEl = document.getElementById('sidebar-favorites-count');
    const favorites = getFavorites();
    const totalCount = favorites.podcasts.length + favorites.episodes.length + favorites.authors.length;
    
    if (favoritesEl) {
        favoritesEl.textContent = String(totalCount);
    }
}

// Load recently listened to page (replaces Continue Listening + Queue pages)
function loadRecentlyListenedPage() {
    const loadingEl = document.getElementById('recent-loading');
    const listEl = document.getElementById('recent-list');
    if (!loadingEl || !listEl) return;
    loadingEl.classList.remove('hidden');
    listEl.innerHTML = '';
    setTimeout(() => {
        const recent = getRecentlyListenedEpisodes(100);
        loadingEl.classList.add('hidden');
        if (recent.length === 0) {
            listEl.innerHTML = '<div class="empty"><p>Nothing here yet</p><p class="subtitle">Play episodes to see them in Recently Listened To</p></div>';
            return;
        }
        const html = recent.map(({ episode, podcast, progress: epProgress }) => {
            const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
            const isEpisodePlaying = isCurrentEpisode && isPlaying;
            const isFavorite = isEpisodeFavorited(episode.id);
            const episodeInQueue = isInQueue(episode.id);
            const progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: ${epProgress}%"></div></div>`;
            return `
                <div class="episode-item episode-in-progress ${isCurrentEpisode ? 'episode-playing' : ''}" 
                     oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${podcast.id}');">
                    <div class="episode-item-image">
                        <img src="${podcast.image_url || getPlaceholderImage()}" 
                             alt="${escapeHtml(podcast.title || '')}" 
                             class="episode-list-artwork"
                             onerror="this.src='${getPlaceholderImage()}'">
                    </div>
                    <button class="btn-episode-play ${isEpisodePlaying ? 'playing' : ''}" onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}" title="${isEpisodePlaying ? 'Pause' : 'Play'}">
                        <span class="episode-play-icon" data-episode-id="${episode.id}">${isEpisodePlaying ? '⏸' : '▶'}</span>
                    </button>
                    <div class="episode-item-main" onclick="openEpisodeDetail('${episode.id}', '${podcast.id}')">
                        <div class="episode-title">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                        <div class="episode-meta">
                            <span onclick="event.stopPropagation(); openEpisodes('${podcast.id}')" style="cursor: pointer; text-decoration: underline;">${escapeHtml(podcast.title || 'Unknown Podcast')}</span>
                            ${episode.pub_date ? `<span>• ${formatDate(episode.pub_date)}</span>` : ''}
                            ${episode.duration_seconds ? `<span>• ${formatDuration(episode.duration_seconds)}</span>` : ''}
                            <span class="episode-progress-text">${Math.round(epProgress)}%</span>
                        </div>
                        ${progressBar}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn-queue-small ${episodeInQueue ? 'in-queue' : ''}" 
                                onclick="event.stopPropagation(); ${episodeInQueue ? `removeFromQueue('${episode.id}')` : `addToQueue('${episode.id}', '${podcast.id}')`}; loadRecentlyListenedPage(); renderSidebar();" 
                                title="${episodeInQueue ? 'Remove from queue' : 'Add to queue'}">
                            ${episodeInQueue ? '✓' : '+'}
                        </button>
                        <button class="btn-remove-history" onclick="event.stopPropagation(); removeFromContinueListening('${episode.id}'); loadRecentlyListenedPage(); renderSidebar();" title="Remove from list">✕</button>
                        <button class="btn-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleEpisodeFavorite('${episode.id}', '${podcast.id}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFavorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        listEl.innerHTML = html;
    }, 300);
}

// Render authors count in sidebar
function renderAuthorsCount() {
    const authorsEl = document.getElementById('sidebar-authors-count');
    if (authorsEl) {
        const count = authors && Array.isArray(authors) ? authors.length : 0;
        authorsEl.textContent = String(count);
    }
}

// Get favorites from localStorage
function getFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}');
        return {
            podcasts: stored.podcasts || [],
            episodes: stored.episodes || [],
            authors: stored.authors || []
        };
    } catch (e) {
        return { podcasts: [], episodes: [], authors: [] };
    }
}

// Save favorites to localStorage
function saveFavorites(favorites) {
    try {
        // Ensure favorites object has required structure
        if (!favorites.podcasts) favorites.podcasts = [];
        if (!favorites.episodes) favorites.episodes = [];
        if (!favorites.authors) favorites.authors = [];
        
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        renderSidebar(); // This calls renderFavorites() internally
        debouncedSync(); // Sync to server if enabled
    } catch (e) {
        console.error('Error saving favorites:', e);
        // If storage is full or blocked, try to continue anyway
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('LocalStorage quota exceeded. Favorites may not persist.');
        }
    }
}

// Check if podcast is favorited
function isPodcastFavorited(podcastId) {
    const favorites = getFavorites();
    return favorites.podcasts.includes(String(podcastId));
}

// Check if episode is favorited
function isEpisodeFavorited(episodeId) {
    const favorites = getFavorites();
    return favorites.episodes.some(e => e.id === String(episodeId));
}

// Check if author is favorited
function isAuthorFavorited(authorName) {
    const favorites = getFavorites();
    return favorites.authors.includes(String(authorName));
}

// Toggle author favorite
function toggleAuthorFavorite(authorName) {
    try {
        if (!authorName) {
            console.error('toggleAuthorFavorite: authorName is missing');
            return;
        }
        
        const favorites = getFavorites();
        
        // Ensure authors array exists
        if (!Array.isArray(favorites.authors)) {
            favorites.authors = [];
        }
        
        const name = String(authorName);
        const index = favorites.authors.indexOf(name);
        
        if (index > -1) {
            // Remove from favorites
            favorites.authors.splice(index, 1);
        } else {
            // Add to favorites
            favorites.authors.push(name);
        }
        
        saveFavorites(favorites);
        
        // Re-render authors to update favorite buttons
        renderAuthors();
        
        // Update sidebar favorites count
        renderFavorites();
        
        // Update favorites page if on it
        if (currentPage === 'favorites') {
            loadFavoritesPage();
        }
    } catch (error) {
        console.error('Error toggling author favorite:', error);
    }
}

// Toggle podcast favorite
function togglePodcastFavorite(podcastId) {
    try {
        if (!podcastId) {
            console.error('togglePodcastFavorite: podcastId is missing');
            return;
        }
        
        const favorites = getFavorites();
        
        // Ensure podcasts array exists
        if (!Array.isArray(favorites.podcasts)) {
            favorites.podcasts = [];
        }
        
        const id = String(podcastId);
        const index = favorites.podcasts.indexOf(id);
        
        const podcast = podcasts.find(p => String(p.id) === id);
        const isFavorite = index === -1; // Will be favorite after toggle
        
        if (index > -1) {
            // Remove from favorites
            favorites.podcasts.splice(index, 1);
        } else {
            // Add to favorites
            favorites.podcasts.push(id);
        }
        
        // Track favorite action
        if (window.analytics && podcast) {
            window.analytics.trackFavoritePodcast(podcast, isFavorite);
        }
        
        saveFavorites(favorites);
        
        // Re-render podcasts to update favorite buttons
        renderPodcasts();
        
        // Update sidebar favorites count
        renderFavorites();
        
        // Update episodes page if on it (to update the header favorite button)
        if (currentPage === 'episodes' && currentPodcast) {
            loadEpisodesPage();
        }
        
        // Update favorites page if on it
        if (currentPage === 'favorites') {
            loadFavoritesPage();
        }
    } catch (error) {
        console.error('Error toggling podcast favorite:', error);
    }
}

// Toggle episode favorite
function toggleEpisodeFavorite(episodeId, podcastId) {
    const favorites = getFavorites();
    const id = String(episodeId);
    const existingIndex = favorites.episodes.findIndex(e => e.id === id);
    
    const episode = allEpisodes.find(e => String(e.id) === id) || 
                   (currentPodcast && episodesCache[currentPodcast.id]?.find(e => String(e.id) === id));
    const podcast = podcasts.find(p => String(p.id) === String(podcastId));
    const isFavorite = existingIndex === -1; // Will be favorite after toggle
    
    if (existingIndex > -1) {
        favorites.episodes.splice(existingIndex, 1);
    } else {
        favorites.episodes.push({
            id: id,
            podcastId: String(podcastId),
            timestamp: Date.now()
        });
    }
    
    // Track favorite action
    if (window.analytics && episode && podcast) {
        window.analytics.trackFavoriteEpisode(episode, podcast, isFavorite);
    }
    
    saveFavorites(favorites);
    
    // Reload current page if it shows episodes
    if (currentPage === 'episodes' && currentPodcast) {
        loadEpisodesPage();
    } else if (currentPage === 'favorites') {
        loadFavoritesPage();
    } else if (currentPage === 'episode' && displayedEpisode) {
        loadEpisodeDetailPage();
    } else if (currentPage === 'history') {
        loadRecentlyListenedPage();
    }
    
    renderSidebar();
}

// Load sounds page
async function loadSoundsPage() {
    const loadingEl = document.getElementById('sounds-loading');
    const controlsEl = document.getElementById('sounds-controls');
    const gridEl = document.getElementById('sounds-grid');
    const countEl = document.getElementById('sounds-count');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (controlsEl) controlsEl.classList.add('hidden');
    if (gridEl) gridEl.innerHTML = '';
    
    try {
        // Load sounds if not already loaded
        if (sounds.length === 0) {
            sounds = await apiService.fetchSounds();
        }
        
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (sounds.length === 0) {
            if (gridEl) {
                gridEl.innerHTML = '<div class="empty"><p>No sounds available</p></div>';
            }
            return;
        }
        
        if (controlsEl) controlsEl.classList.remove('hidden');
        if (countEl) {
            countEl.textContent = `${sounds.length} ${sounds.length === 1 ? 'sound' : 'sounds'}`;
        }
        
        // Update sort select
        const sortSelect = document.getElementById('sounds-sort-select');
        if (sortSelect) {
            sortSelect.value = soundsSortMode;
        }
        
        renderSounds();
    } catch (error) {
        console.error('Error loading sounds:', error);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (gridEl) {
            gridEl.innerHTML = '<div class="error"><p>Error loading sounds</p><button onclick="loadSoundsPage()" class="btn-retry">Retry</button></div>';
        }
    }
}

// Get emoji for sound based on title
function getSoundEmoji(title) {
    if (!title) return '🎵';
    
    const titleLower = title.toLowerCase();
    
    // Water-related
    if (anyWordIn(titleLower, ['ocean', 'wave', 'water', 'stream', 'brook', 'waterfall', 'tidepool', 'river'])) {
        return '🌊';
    }
    // Rain-related
    else if (anyWordIn(titleLower, ['rain', 'rainfall', 'dripping'])) {
        return '🌧️';
    }
    // Wind-related
    else if (titleLower.includes('wind')) {
        return '💨';
    }
    // Thunder-related
    else if (titleLower.includes('thunder')) {
        return '⛈️';
    }
    // Bird-related
    else if (anyWordIn(titleLower, ['bird', 'woodpecker', 'peeper'])) {
        return '🐦';
    }
    // Insect-related
    else if (anyWordIn(titleLower, ['cricket', 'katydid', 'insect'])) {
        return '🦗';
    }
    // Forest-related
    else if (anyWordIn(titleLower, ['forest', 'wood', 'swamp'])) {
        return '🌲';
    }
    // Night-related
    else if (anyWordIn(titleLower, ['night', 'dusk', 'duskfall'])) {
        return '🌙';
    }
    // Snow-related
    else if (anyWordIn(titleLower, ['snow', 'icicle', 'winter'])) {
        return '❄️';
    }
    // Mountain-related
    else if (titleLower.includes('mountain')) {
        return '⛰️';
    }
    // Default nature
    else {
        return '🌿';
    }
}

// Helper function to check if any word is in the title
function anyWordIn(title, words) {
    return words.some(word => title.includes(word));
}

// Generate gradient color based on sound title or index
function getSoundGradient(index, title) {
    // Use the same gradient for all sounds (cyan-purple, like dripping icicles)
    return ['#30cfd0', '#330867']; // Cyan-Purple
}

// Render sounds list (grid mode removed)
function renderSounds() {
    const sortedSounds = sortSounds(sounds);
    const listEl = document.getElementById('sounds-list');
    const gridEl = document.getElementById('sounds-grid');
    
    if (!listEl) {
        console.error('sounds-list element not found');
        return;
    }
    
    // Hide grid, show list
    if (gridEl) gridEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    
    listEl.innerHTML = sortedSounds.map((sound, index) => {
        // Use tracking flag for reliable play state detection
        const soundIsPlaying = currentSound && currentSound.id === sound.id && soundIsActuallyPlaying;
        const [color1, color2] = getSoundGradient(index, sound.title);
        const emoji = getSoundEmoji(sound.title);
        
        return `
        <div class="podcast-list-item">
            <div class="podcast-list-item-content" onclick="playSound('${sound.id}')">
                <div class="podcast-list-image">
                    <div class="sound-list-gradient" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);">
                        <span class="sound-list-gradient-icon">${emoji}</span>
                    </div>
                </div>
                <div class="podcast-list-info">
                    <div class="podcast-list-title">${escapeHtml(sound.title || 'Untitled Sound')}</div>
                </div>
            </div>
            <div class="sound-list-play-button ${soundIsPlaying ? 'playing' : ''}" onclick="event.stopPropagation(); toggleSoundPlayPauseFromList('${sound.id}');">
                ${soundIsPlaying ? '⏸' : '▶'}
            </div>
        </div>
    `;
    }).join('');
}

// Sort sounds
function sortSounds(soundsToSort) {
    const sorted = [...soundsToSort];
    
    switch (soundsSortMode) {
        case 'title-asc':
            sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'title-desc':
            sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            break;
        default:
            break;
    }
    
    return sorted;
}

// Apply sounds sorting
function applySoundsSorting() {
    const sortSelect = document.getElementById('sounds-sort-select');
    if (sortSelect) {
        soundsSortMode = sortSelect.value;
        renderSounds();
    }
}

// Set sounds view mode (list only - grid mode removed)
function setSoundsViewMode(mode) {
    // Always use list mode
    soundsViewMode = 'list';
    const listEl = document.getElementById('sounds-list');
    const gridEl = document.getElementById('sounds-grid');
    
    if (gridEl) gridEl.classList.add('hidden');
    if (listEl) listEl.classList.remove('hidden');
    
    renderSounds();
}

// Play sound with seamless looping
function playSound(soundId) {
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) {
        console.error('Sound not found:', soundId);
        return;
    }
    
    // ALWAYS stop any currently playing sound first (whether same or different)
    if (currentSound) {
        stopSeamlessLoop();
        if (soundAudioPlayer) {
            soundAudioPlayer.pause();
            soundAudioPlayer.currentTime = 0;
            soundAudioPlayer.loop = false;
        }
        soundIsActuallyPlaying = false;
    }
    
    // Stop any currently playing episode and hide episode player
    if (audioPlayer && currentEpisode) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        currentEpisode = null;
        isPlaying = false;
        updatePlayPauseButton();
        const playerBar = document.getElementById('player-bar');
        if (playerBar) {
            playerBar.classList.add('hidden');
            document.body.classList.remove('player-bar-visible');
        }
    }
    
    // Create sound audio player if it doesn't exist
    if (!soundAudioPlayer) {
        soundAudioPlayer = document.createElement('audio');
        soundAudioPlayer.preload = 'auto';
        soundAudioPlayer.playsInline = true; // Allow playing in silent mode on iOS
        soundAudioPlayer.setAttribute('playsinline', 'true');
        soundAudioPlayer.setAttribute('webkit-playsinline', 'true');
        // Configure for background playback
        if (soundAudioPlayer.setAttribute) {
            soundAudioPlayer.setAttribute('x-webkit-airplay', 'allow');
        }
        // Enable cross-origin for CORS if needed
        soundAudioPlayer.crossOrigin = 'anonymous';
        // Set loop attribute for seamless looping (works better on iOS)
        soundAudioPlayer.loop = true;
        document.body.appendChild(soundAudioPlayer);
        
        // Handle audio interruptions (phone calls, lock screen, etc.)
        soundAudioPlayer.addEventListener('pause', (e) => {
            // Don't update UI if pause was due to interruption - we'll resume automatically
            if (currentSound && !soundAudioPlayer.ended) {
                // Try to resume after a short delay (handles interruptions)
                // This is important for background playback when phone locks
                setTimeout(() => {
                    if (currentSound && soundAudioPlayer.paused && !soundAudioPlayer.ended) {
                        // Only resume if we're using HTML5 audio (not Web Audio API)
                        if (!soundAudioSource || soundAudioContext.state !== 'running') {
                            soundAudioPlayer.play().catch(err => {
                                console.log('Auto-resume after interruption failed:', err);
                            });
                        }
                    }
                }, 200);
            }
            updateSoundPlayerUI();
            updateSleepTimerUI();
        });
        
        // Handle when audio ends (shouldn't happen with looping, but just in case)
        soundAudioPlayer.addEventListener('ended', () => {
            if (currentSound && !soundAudioPlayer.ended) {
                // Restart if it somehow ended
                soundAudioPlayer.currentTime = 0;
                soundAudioPlayer.play().catch(err => {
                    console.log('Error restarting after end:', err);
                });
            }
        });
        
        // Update UI when sound starts playing
        soundAudioPlayer.addEventListener('play', () => {
            updateSoundPlayerUI();
            updateSleepTimerUI();
            // Update Media Session playback state
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        });
        
        // Update UI when sound pauses
        soundAudioPlayer.addEventListener('pause', () => {
            // Only update Media Session if this is a user-initiated pause
            // (not an interruption that we'll auto-resume)
            if ('mediaSession' in navigator && currentSound) {
                // Small delay to check if we're auto-resuming
                setTimeout(() => {
                    if (soundAudioPlayer && soundAudioPlayer.paused && currentSound) {
                        navigator.mediaSession.playbackState = 'paused';
                    }
                }, 300);
            }
        });
        
        // Handle audio errors
        soundAudioPlayer.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            // Try to recover by reloading
            if (currentSound && soundAudioPlayer.src) {
                soundAudioPlayer.load();
            }
        });
    }
    
    // Set current sound and start playing
    currentSound = sound;
    
    // Set source (for fallback and time tracking)
    soundAudioPlayer.src = sound.audio_url;
    
    // Load
    soundAudioPlayer.load();
    
    // Show sound player bar
    const soundPlayerBar = document.getElementById('sound-player-bar');
    if (soundPlayerBar) {
        soundPlayerBar.classList.remove('hidden');
        document.body.classList.add('sound-player-visible');
    }
    
    // Update sound player UI
    updateSoundPlayerUI();
    
    // Update Media Session API for lock screen
    updateMediaSessionMetadata();
    
    // Start seamless looping (will use Web Audio API if available)
    // Resume audio context first if it was suspended
    if (soundAudioContext && soundAudioContext.state === 'suspended') {
        soundAudioContext.resume().then(() => {
            startSeamlessLoop().then(() => {
                updateSoundPlayerUI();
                renderSounds();
                updateSleepTimerUI();
                addSoundToHistory(sound.id);
            }).catch(err => {
                console.log('Error starting seamless loop, trying HTML5 fallback:', err);
                if (soundAudioPlayer) {
                    soundAudioPlayer.loop = true;
                    soundAudioPlayer.load();
                    soundAudioPlayer.play().then(() => {
                        soundIsActuallyPlaying = true;
                        soundLoopCheckFunction = () => {
                            if (!soundAudioPlayer || !currentSound || soundAudioPlayer.paused) {
                                return;
                            }
                            if (soundAudioPlayer.duration && 
                                soundAudioPlayer.currentTime >= soundAudioPlayer.duration - 0.05) {
                                soundAudioPlayer.currentTime = 0;
                            }
                        };
                        soundAudioPlayer.addEventListener('timeupdate', soundLoopCheckFunction);
                        updateSoundPlayerUI();
                        renderSounds();
                        updateSleepTimerUI();
                        addSoundToHistory(sound.id);
                    }).catch(error => {
                        console.log('Error playing HTML5 audio:', error);
                        updateSoundPlayerUI();
                        updateSleepTimerUI();
                    });
                }
            });
        }).catch(err => {
            console.log('Error resuming audio context, trying to start anyway:', err);
            startSeamlessLoop().then(() => {
                updateSoundPlayerUI();
                renderSounds();
                updateSleepTimerUI();
                addSoundToHistory(sound.id);
            }).catch(err2 => {
                console.log('Error starting seamless loop:', err2);
                if (soundAudioPlayer) {
                    soundAudioPlayer.loop = true;
                    soundAudioPlayer.load();
                    soundAudioPlayer.play().then(() => {
                        soundIsActuallyPlaying = true;
                        updateSoundPlayerUI();
                        renderSounds();
                        updateSleepTimerUI();
                        addSoundToHistory(sound.id);
                    }).catch(error => {
                        console.log('Error playing HTML5 audio:', error);
                        updateSoundPlayerUI();
                        updateSleepTimerUI();
                    });
                }
            });
        });
    } else {
        startSeamlessLoop().then(() => {
            updateSoundPlayerUI();
            renderSounds();
            updateSleepTimerUI();
            addSoundToHistory(sound.id);
        }).catch(err => {
            console.log('Error starting seamless loop, trying HTML5 fallback:', err);
            if (soundAudioPlayer) {
                soundAudioPlayer.loop = true;
                soundAudioPlayer.load();
                soundAudioPlayer.play().then(() => {
                    soundIsActuallyPlaying = true;
                    soundLoopCheckFunction = () => {
                        if (!soundAudioPlayer || !currentSound || soundAudioPlayer.paused) {
                            return;
                        }
                        if (soundAudioPlayer.duration && 
                            soundAudioPlayer.currentTime >= soundAudioPlayer.duration - 0.05) {
                            soundAudioPlayer.currentTime = 0;
                        }
                    };
                    soundAudioPlayer.addEventListener('timeupdate', soundLoopCheckFunction);
                    updateSoundPlayerUI();
                    renderSounds();
                    updateSleepTimerUI();
                    addSoundToHistory(sound.id);
                }).catch(error => {
                    console.log('Error playing HTML5 audio:', error);
                    updateSoundPlayerUI();
                    updateSleepTimerUI();
                });
            }
        });
    }
    
    // Track sound play
    if (window.analytics) {
        window.analytics.trackEvent('sound_play', {
            sound_id: sound.id,
            sound_title: sound.title,
            category: sound.category
        });
    }
}

// Update sound player UI
function updateSoundPlayerUI() {
    const soundPlayerBar = document.getElementById('sound-player-bar');
    if (!soundPlayerBar) return;
    
    if (!currentSound) {
        soundPlayerBar.classList.add('hidden');
        document.body.classList.remove('sound-player-visible');
        return;
    }
    
    // Update title
    const titleEl = document.getElementById('sound-player-title');
    const playIconEl = document.getElementById('sound-player-play-icon');
    
    if (titleEl) titleEl.textContent = currentSound.title || 'Nature Sound';
    
    // Update play/pause button - use tracking flag for reliable detection
    if (playIconEl) {
        // Show pause icon (⏸) when playing, play icon (▶) when paused
        playIconEl.textContent = soundIsActuallyPlaying ? '⏸' : '▶';
    }
    
    // Update sound cards if on sounds page
    if (currentPage === 'sounds') {
        renderSounds();
    }
}

// Toggle sound play/pause/stop - combines play and stop functionality
function toggleSoundPlayPause() {
    if (!currentSound) return;
    
    // If sound player doesn't exist or different sound, initialize it
    if (!soundAudioPlayer || !soundAudioPlayer.src || 
        (!soundAudioPlayer.src.includes(currentSound.audio_url) && 
         !soundAudioPlayer.src.endsWith(currentSound.audio_url.split('/').pop()))) {
        playSound(currentSound.id);
        return;
    }
    
    // Check if playing - use tracking flag for reliable detection
    const isPlaying = soundIsActuallyPlaying;
    
    if (isPlaying) {
        // If playing, stop completely (reset to beginning)
        stopSeamlessLoop();
        
        // Stop HTML5 audio completely
        if (soundAudioPlayer) {
            soundAudioPlayer.pause();
            soundAudioPlayer.currentTime = 0;
            soundAudioPlayer.loop = false;
        }
        
        // Remove loop check function
        if (soundLoopCheckFunction && soundAudioPlayer) {
            soundAudioPlayer.removeEventListener('timeupdate', soundLoopCheckFunction);
            soundLoopCheckFunction = null;
        }
        
        // Stop second player if it exists
        if (soundAudioPlayer2) {
            soundAudioPlayer2.pause();
            soundAudioPlayer2.currentTime = 0;
            soundAudioPlayer2.volume = 0;
            soundAudioPlayer2.loop = false;
        }
        
        // Stop crossfade interval if running
        if (soundLoopFadeInterval) {
            clearInterval(soundLoopFadeInterval);
            soundLoopFadeInterval = null;
        }
        
        // Reset volume
        if (soundAudioPlayer) {
            soundAudioPlayer.volume = 1;
        }
        
        // Mark as not playing
        soundIsActuallyPlaying = false;
        
        // Update UI
        updateSoundPlayerUI();
        updateSoundDetailPlayButton();
        updateSleepTimerUI();
        renderSounds();
        
        // Update Media Session
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
    } else {
        // If paused/stopped, play
        // Resume audio context if it was suspended
        if (soundAudioContext && soundAudioContext.state === 'suspended') {
            soundAudioContext.resume().then(() => {
                startSeamlessLoop().then(() => {
                    updateMediaSessionMetadata();
                    updateSoundPlayerUI();
                    updateSoundDetailPlayButton();
                    updateSleepTimerUI();
                    renderSounds();
                }).catch(err => {
                    console.log('Error starting seamless loop:', err);
                    // Fallback to HTML5
                    if (soundAudioPlayer) {
                        soundAudioPlayer.loop = true;
                        soundAudioPlayer.play().catch(e => console.log('Error:', e));
                    }
                    updateMediaSessionMetadata();
                    updateSoundPlayerUI();
                    updateSoundDetailPlayButton();
                    updateSleepTimerUI();
                    renderSounds();
                });
            }).catch(err => {
                console.log('Error resuming audio context:', err);
                // Try to start anyway
                startSeamlessLoop().then(() => {
                    updateMediaSessionMetadata();
                    updateSoundPlayerUI();
                    updateSoundDetailPlayButton();
                    updateSleepTimerUI();
                    renderSounds();
                }).catch(err2 => {
                    console.log('Error starting seamless loop:', err2);
                    // Fallback to HTML5
                    if (soundAudioPlayer) {
                        soundAudioPlayer.loop = true;
                        soundAudioPlayer.play().catch(e => console.log('Error:', e));
                    }
                    updateMediaSessionMetadata();
                    updateSoundPlayerUI();
                    updateSoundDetailPlayButton();
                    updateSleepTimerUI();
                    renderSounds();
                });
            });
        } else {
            startSeamlessLoop().then(() => {
                updateMediaSessionMetadata();
                updateSoundPlayerUI();
                updateSoundDetailPlayButton();
                updateSleepTimerUI();
                renderSounds();
            }).catch(err => {
                console.log('Error starting seamless loop:', err);
                // Fallback to HTML5
                if (soundAudioPlayer) {
                    soundAudioPlayer.loop = true;
                    soundAudioPlayer.play().catch(e => console.log('Error:', e));
                }
                updateMediaSessionMetadata();
                updateSoundPlayerUI();
                updateSoundDetailPlayButton();
                updateSleepTimerUI();
                renderSounds();
            });
        }
        return; // Early return since startSeamlessLoop handles UI updates
    }
    
    updateSoundPlayerUI();
    updateSoundDetailPlayButton();
    updateSleepTimerUI(); // Update sidebar timer visibility
    renderSounds(); // Update UI
}

// Open sound detail page - now just plays the sound
function openSoundDetail(soundId) {
    playSound(soundId);
}

// Load sound detail page
function loadSoundDetailPage() {
    if (!currentSound) {
        navigateTo('sounds');
        return;
    }
    
    const titleEl = document.getElementById('sound-detail-title');
    const imageEl = document.getElementById('sound-detail-image');
    const descriptionEl = document.getElementById('sound-detail-description');
    const playIconEl = document.getElementById('sound-detail-play-icon');
    const backgroundEl = document.getElementById('sound-detail-background');
    
    if (titleEl) titleEl.textContent = currentSound.title || 'Nature Sound';
    
    if (imageEl) {
            if (currentSound.image_url) {
            imageEl.src = sanitizeImageUrl(currentSound.image_url) || getPlaceholderImage();
            imageEl.style.display = '';
        } else {
            imageEl.style.display = 'none';
        }
    }
    
    if (descriptionEl) {
        if (currentSound.description) {
            descriptionEl.textContent = currentSound.description;
            descriptionEl.style.display = '';
        } else {
            descriptionEl.style.display = 'none';
        }
    }
    
    // Set animated background based on category
    if (backgroundEl) {
        const category = currentSound.category || 'nature';
        backgroundEl.className = `sound-detail-background sound-category-${category}`;
    }
    
    // Update play button state
    updateSoundDetailPlayButton();
    
    // Don't auto-play when opening detail page - let user click play button
    // Just ensure the sound is ready if it's the current sound
    if (soundAudioPlayer && currentSound && soundAudioPlayer.src) {
        const isCurrentSound = soundAudioPlayer.src === currentSound.audio_url || 
                              soundAudioPlayer.src.endsWith(currentSound.audio_url.split('/').pop());
        if (isCurrentSound) {
            // Sound is already loaded, just update UI
            updateSoundDetailPlayButton();
        }
    }
}

// Update play button on sound detail page
function updateSoundDetailPlayButton() {
    const playIconEl = document.getElementById('sound-detail-play-icon');
    if (playIconEl && currentSound) {
        // Use tracking flag for reliable detection
        playIconEl.textContent = soundIsActuallyPlaying ? '⏸' : '▶';
    }
}

// Toggle sound play/pause from list view
function toggleSoundPlayPauseFromList(soundId) {
    if (currentSound && currentSound.id === soundId && soundIsActuallyPlaying) {
        toggleSoundPlayPause(); // If same sound and playing, pause
    } else {
        playSound(soundId); // If different sound or not playing, play it
    }
}

// Go back from sound detail
function goBackFromSound() {
    navigateTo('sounds');
}

// Initialize Web Audio API context for seamless looping
function initSoundAudioContext() {
    if (!soundAudioContext) {
        try {
            soundAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Configure audio session for background playback and silent mode on iOS
            // This allows audio to play even when phone is locked or in silent mode
            if (soundAudioContext.setSinkId) {
                // Modern browsers
            }
            
            // Handle audio context interruptions (e.g., phone call, lock screen)
            soundAudioContext.addEventListener('statechange', () => {
                if (soundAudioContext.state === 'interrupted' && currentSound) {
                    // Resume playback when interruption ends
                    soundAudioContext.resume().then(() => {
                        if (soundAudioSource && soundAudioSource.buffer) {
                            // Restart the loop if it was interrupted
                            startSeamlessLoop();
                        }
                    }).catch(err => {
                        console.log('Error resuming audio context:', err);
                    });
                } else if (soundAudioContext.state === 'suspended' && currentSound) {
                    // Auto-resume if suspended (e.g., phone locked)
                    soundAudioContext.resume().catch(err => {
                        console.log('Error auto-resuming audio context:', err);
                    });
                }
            });
        } catch (e) {
            console.error('Web Audio API not supported:', e);
            return false;
        }
    }
    
    // Always resume if suspended (required for background playback)
    if (soundAudioContext.state === 'suspended') {
        soundAudioContext.resume().catch(err => {
            console.log('Error resuming audio context:', err);
        });
    }
    
    return true;
}

// Load audio buffer for seamless looping
async function loadSoundAudioBuffer(audioUrl) {
    if (!initSoundAudioContext()) {
        return null;
    }
    
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await soundAudioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (e) {
        console.error('Error loading audio buffer:', e);
        return null;
    }
}

// Detect iOS device
function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Start seamless looping using Web Audio API
async function startSeamlessLoop() {
    if (!currentSound || !soundAudioPlayer) return Promise.resolve();
    
    // Stop any existing Web Audio source
    stopSeamlessLoop();
    
    // Try Web Audio API first for truly seamless looping (works on all platforms including iOS)
    // Web Audio API with loop=true provides buffer-level looping which is truly seamless
    // This is the best method for seamless looping as it handles the loop at the buffer level
    if (initSoundAudioContext()) {
        try {
            // Resume audio context if suspended (required on mobile)
            // Always try to resume to ensure context is active
            if (soundAudioContext.state === 'suspended' || soundAudioContext.state === 'interrupted') {
                await soundAudioContext.resume();
            }
            // If still suspended after resume attempt, try again
            if (soundAudioContext.state === 'suspended') {
                await soundAudioContext.resume();
            }
            
            // Load the audio buffer
            const buffer = await loadSoundAudioBuffer(currentSound.audio_url);
            if (buffer) {
                soundAudioBuffer = buffer;
                
                // Create a new source node
                soundAudioSource = soundAudioContext.createBufferSource();
                soundAudioSource.buffer = buffer;
                soundAudioSource.loop = true; // This provides truly seamless looping
                soundAudioSource.loopStart = 0; // Start loop from beginning
                soundAudioSource.loopEnd = buffer.duration; // Loop to end
                
                // Connect to destination (speakers)
                soundAudioSource.connect(soundAudioContext.destination);
                
                // Handle source node ending (shouldn't happen with loop=true, but just in case)
                // Store a flag to prevent auto-restart when we manually stop
                soundAudioSource._manuallyStopped = false;
                soundAudioSource.onended = () => {
                    // Only restart if it wasn't manually stopped and we still have a current sound
                    if (!soundAudioSource._manuallyStopped && currentSound && soundAudioBuffer) {
                        startSeamlessLoop();
                    }
                };
                
                // Store start time for tracking
                const startTime = soundAudioContext.currentTime;
                soundAudioSource._startTime = startTime;
                
                // Start playing
                soundAudioSource.start(0);
                soundIsActuallyPlaying = true; // Mark as playing
                
                // Pause the HTML5 audio player (we'll use it for time tracking)
                soundAudioPlayer.pause();
                soundAudioPlayer.currentTime = 0;
                
                // Sync HTML5 player for time tracking
                const syncInterval = setInterval(() => {
                    if (soundAudioSource && soundAudioContext && soundAudioBuffer) {
                        // Calculate current time based on when we started
                        const elapsed = soundAudioContext.currentTime - startTime;
                        const duration = soundAudioBuffer.duration;
                        soundAudioPlayer.currentTime = elapsed % duration;
                    }
                }, 100);
                
                // Store sync interval for cleanup
                soundAudioSource._syncInterval = syncInterval;
                
                // Keep audio context alive for background playback
                // Periodically resume if it gets suspended (handles phone sleep/lock)
                // Check more frequently to catch suspensions quickly
                const keepAliveInterval = setInterval(() => {
                    if (soundAudioContext && currentSound) {
                        if (soundAudioContext.state === 'suspended' || soundAudioContext.state === 'interrupted') {
                            soundAudioContext.resume().then(() => {
                                // If source was stopped due to interruption, restart it
                                if (!soundAudioSource || !soundAudioSource.buffer) {
                                    startSeamlessLoop();
                                }
                            }).catch(err => {
                                console.log('Error keeping audio context alive:', err);
                            });
                        }
                    } else {
                        clearInterval(keepAliveInterval);
                    }
                }, 1000); // Check every 1 second for faster response
                
                soundAudioSource._keepAliveInterval = keepAliveInterval;
                
                // Also set up a more aggressive resume on page visibility changes
                const handleVisibilityChange = () => {
                    if (soundAudioContext && currentSound) {
                        if (soundAudioContext.state === 'suspended' || soundAudioContext.state === 'interrupted') {
                            soundAudioContext.resume().then(() => {
                                if (!soundAudioSource || !soundAudioSource.buffer) {
                                    startSeamlessLoop();
                                }
                            }).catch(err => {
                                console.log('Error resuming on visibility change:', err);
                            });
                        }
                    }
                };
                
                document.addEventListener('visibilitychange', handleVisibilityChange);
                soundAudioSource._visibilityHandler = handleVisibilityChange;
                
                return Promise.resolve(); // Successfully using Web Audio API
            }
        } catch (e) {
            console.error('Error with Web Audio API, falling back to HTML5:', e);
        }
    }
    
    // Fallback to HTML5 audio with loop attribute
    // Note: HTML5 loop may have slight gaps with MP3 files due to encoder padding
    // For truly seamless looping, Web Audio API (above) is preferred
    if (soundAudioPlayer && soundAudioPlayer.paused) {
        try {
            // Set loop attribute for seamless looping
            soundAudioPlayer.loop = true;
            await soundAudioPlayer.play();
            soundIsActuallyPlaying = true; // Mark as playing
            
            // Simple backup check - if loop attribute doesn't work perfectly, reset near the end
            soundLoopCheckFunction = () => {
                // Check if paused - don't do anything if paused
                if (!soundAudioPlayer || !currentSound || soundAudioPlayer.paused) {
                    return;
                }
                // Double-check paused state
                if (soundAudioPlayer.paused) {
                    return;
                }
                
                // Backup: if we're very close to the end and loop didn't work, reset
                // This should rarely be needed with loop=true, but helps with MP3 encoder gaps
                const duration = soundAudioPlayer.duration;
                if (duration && soundAudioPlayer.currentTime >= duration - 0.05) {
                    soundAudioPlayer.currentTime = 0;
                }
            };
            
            soundAudioPlayer.addEventListener('timeupdate', soundLoopCheckFunction);
            
            return Promise.resolve();
        } catch (err) {
            console.log('Error playing HTML5 audio fallback:', err);
            return Promise.reject(err);
        }
    }
    
    return Promise.resolve();
}

// Stop seamless looping
function stopSeamlessLoop() {
    // Stop Web Audio API source
    if (soundAudioSource) {
        try {
            // Mark as manually stopped to prevent auto-restart
            soundAudioSource._manuallyStopped = true;
            
            // Clear intervals
            if (soundAudioSource._syncInterval) {
                clearInterval(soundAudioSource._syncInterval);
            }
            if (soundAudioSource._keepAliveInterval) {
                clearInterval(soundAudioSource._keepAliveInterval);
            }
            if (soundAudioSource._visibilityHandler) {
                document.removeEventListener('visibilitychange', soundAudioSource._visibilityHandler);
            }
            
            // Stop and disconnect the source
            try {
                soundAudioSource.stop();
            } catch (e) {
                // Source may already be stopped or not started yet
            }
            try {
                soundAudioSource.disconnect();
            } catch (e) {
                // Source may already be disconnected
            }
        } catch (e) {
            // Source may already be stopped
            console.log('Error stopping Web Audio source:', e);
        }
        soundAudioSource = null;
    }
    
    // Mark as not playing
    soundIsActuallyPlaying = false;
    
    // Stop HTML5 audio loop check
    if (soundAudioPlayer && soundLoopCheckFunction) {
        soundAudioPlayer.removeEventListener('timeupdate', soundLoopCheckFunction);
        soundLoopCheckFunction = null;
    }
}

// Update Media Session API metadata for lock screen
function updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator) || !currentSound) return;
    
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSound.title || 'Nature Sound',
            artist: 'Nature Sounds',
            album: 'Ambient Sounds',
            artwork: currentSound.image_url ? [
                { src: sanitizeImageUrl(currentSound.image_url) || getPlaceholderImage(), sizes: '512x512', type: 'image/jpeg' }
            ] : []
        });
        
        // Set playback state for better background support
        const isPlaying = (soundAudioSource && soundAudioContext && soundAudioContext.state === 'running') || 
                          (soundAudioPlayer && !soundAudioPlayer.paused);
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        
        // Set action handlers
        navigator.mediaSession.setActionHandler('play', () => {
            if (currentSound) {
                const isCurrentlyPlaying = (soundAudioSource && soundAudioContext && soundAudioContext.state === 'running') || 
                                          (soundAudioPlayer && !soundAudioPlayer.paused);
                if (!isCurrentlyPlaying) {
                    toggleSoundPlayPause();
                }
            }
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            if (currentSound) {
                const isCurrentlyPlaying = (soundAudioSource && soundAudioContext && soundAudioContext.state === 'running') || 
                                          (soundAudioPlayer && !soundAudioPlayer.paused);
                if (isCurrentlyPlaying) {
                    toggleSoundPlayPause();
                }
            }
        });
        
        navigator.mediaSession.setActionHandler('stop', () => {
            if (currentSound) {
                toggleSoundPlayPause();
            }
        });
    } catch (e) {
        console.error('Error updating Media Session:', e);
    }
}

// Stop sound
function stopSound() {
    if (soundAudioPlayer) {
        soundAudioPlayer.pause();
        soundAudioPlayer.currentTime = 0;
        soundAudioPlayer.loop = false;
    }
    stopSeamlessLoop();
    soundIsActuallyPlaying = false; // Mark as not playing
    currentSound = null;
    
    // Hide sound player bar
    const soundPlayerBar = document.getElementById('sound-player-bar');
    if (soundPlayerBar) {
        soundPlayerBar.classList.add('hidden');
        document.body.classList.remove('sound-player-visible');
    }
    
    // Update UI
    if (currentPage === 'sounds') {
        renderSounds();
    } else if (currentPage === 'sound') {
        navigateTo('sounds');
    }
}

// Sleep Timer Functions
function toggleSleepTimerMenu() {
    const episodeMenu = document.getElementById('sleep-timer-menu');
    const soundMenu = document.getElementById('sound-sleep-timer-menu');
    
    // Toggle episode player menu
    if (episodeMenu) {
        episodeMenu.classList.toggle('hidden');
    }
    
    // Toggle sound player menu
    if (soundMenu) {
        soundMenu.classList.toggle('hidden');
    }
    
    // Close other menu if open
    if (episodeMenu && !episodeMenu.classList.contains('hidden') && soundMenu) {
        soundMenu.classList.add('hidden');
    }
    if (soundMenu && !soundMenu.classList.contains('hidden') && episodeMenu) {
        episodeMenu.classList.add('hidden');
    }
}

function closeSleepTimerMenu() {
    const episodeMenu = document.getElementById('sleep-timer-menu');
    const soundMenu = document.getElementById('sound-sleep-timer-menu');
    const sidebarMenu = document.getElementById('sidebar-sleep-timer-menu');
    
    if (episodeMenu) episodeMenu.classList.add('hidden');
    if (soundMenu) soundMenu.classList.add('hidden');
    if (sidebarMenu) sidebarMenu.classList.add('hidden');
}

function toggleSidebarSleepTimerMenu() {
    const sidebarMenu = document.getElementById('sidebar-sleep-timer-menu');
    if (!sidebarMenu) return;
    
    const isCurrentlyHidden = sidebarMenu.classList.contains('hidden');
    
    // Close other menus first
    closeSleepTimerMenu();
    
    // Then toggle sidebar menu
    if (isCurrentlyHidden) {
        sidebarMenu.classList.remove('hidden');
    } else {
        sidebarMenu.classList.add('hidden');
    }
}

function closeSidebarSleepTimerMenu() {
    const sidebarMenu = document.getElementById('sidebar-sleep-timer-menu');
    if (sidebarMenu) {
        sidebarMenu.classList.add('hidden');
    }
}

// Show sleep timer help modal
function showSleepTimerHelp() {
    const modal = document.getElementById('sleep-timer-help-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close sleep timer help modal
function closeSleepTimerHelp() {
    const modal = document.getElementById('sleep-timer-help-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Navigation Help Functions
function showNavigationHelp() {
    const modal = document.getElementById('navigation-help-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeNavigationHelp() {
    const modal = document.getElementById('navigation-help-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function setSleepTimer(minutes) {
    // Cancel existing timer if any
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
    
    // Set new timer
    sleepTimerMinutes = minutes;
    sleepTimerEndTime = Date.now() + (minutes * 60 * 1000);
    
    // Start countdown
    startSleepTimerCountdown();
    
    // Update UI
    updateSleepTimerUI();
    
    // Close menu
    closeSleepTimerMenu();
}

function addSleepTimerMinutes(minutes) {
    if (sleepTimerEndTime) {
        // Add minutes to existing timer
        sleepTimerEndTime += (minutes * 60 * 1000);
        sleepTimerMinutes += minutes;
    } else {
        // Start new timer
        setSleepTimer(minutes);
        return;
    }
    
    // Update UI
    updateSleepTimerUI();
}

function cancelSleepTimer() {
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
    
    sleepTimerEndTime = null;
    sleepTimerMinutes = 0;
    
    // Update UI
    updateSleepTimerUI();
    closeSleepTimerMenu();
}

function startSleepTimerCountdown() {
    // Clear any existing interval
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
    }
    
    // Update immediately
    updateSleepTimerCountdown();
    
    // Update every second
    sleepTimerInterval = setInterval(() => {
        updateSleepTimerCountdown();
        
        // Check if timer expired
        if (sleepTimerEndTime && Date.now() >= sleepTimerEndTime) {
            // Timer expired - pause media
            if (audioPlayer && currentEpisode && !audioPlayer.paused) {
                audioPlayer.pause();
                isPlaying = false;
                updatePlayPauseButton();
                saveProgress(); // Save progress before pausing
            }
            
            if (soundAudioPlayer && currentSound && !soundAudioPlayer.paused) {
                soundAudioPlayer.pause();
                updateSoundPlayerUI();
            }
            
            // Cancel timer
            cancelSleepTimer();
            
            // Show notification (optional)
            if (window.analytics) {
                window.analytics.trackEvent('sleep_timer_expired', {
                    duration: sleepTimerMinutes
                });
            }
        }
    }, 1000);
}

function updateSleepTimerCountdown() {
    if (!sleepTimerEndTime) {
        return;
    }
    
    const remaining = Math.max(0, sleepTimerEndTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update all countdown displays
    const episodeCountdown = document.getElementById('sleep-timer-countdown');
    const soundCountdown = document.getElementById('sound-sleep-timer-countdown');
    const sidebarCountdown = document.getElementById('sidebar-sleep-timer-countdown');
    
    if (episodeCountdown) episodeCountdown.textContent = timeString;
    if (soundCountdown) soundCountdown.textContent = timeString;
    if (sidebarCountdown) sidebarCountdown.textContent = timeString;
    
    // Update button text with minutes and seconds
    const episodeText = document.getElementById('sleep-timer-text');
    const soundText = document.getElementById('sound-sleep-timer-text');
    const sidebarText = document.getElementById('sidebar-sleep-timer-text');
    
    const timerText = minutes > 0 
        ? (seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`)
        : (seconds > 0 ? `${seconds}s` : 'Timer');
    
    if (episodeText) episodeText.textContent = timerText;
    if (soundText) soundText.textContent = timerText;
    if (sidebarText) sidebarText.textContent = timerText;
}

function updateSleepTimerUI() {
    const hasTimer = sleepTimerEndTime !== null;
    
    // Always show sidebar timer (it should always be accessible)
    const sidebarTimerSection = document.getElementById('sidebar-sleep-timer');
    if (sidebarTimerSection) {
        sidebarTimerSection.classList.remove('hidden');
    }
    
    // Episode player UI
    const episodeDisplay = document.getElementById('sleep-timer-display');
    const episodePresets = document.getElementById('sleep-timer-presets');
    const episodeIcon = document.getElementById('sleep-timer-icon');
    
    if (episodeDisplay) {
        episodeDisplay.classList.toggle('hidden', !hasTimer);
    }
    if (episodePresets) {
        episodePresets.classList.toggle('hidden', hasTimer);
    }
    if (episodeIcon) {
        episodeIcon.style.opacity = hasTimer ? '1' : '0.6';
    }
    
    // Sound player UI
    const soundDisplay = document.getElementById('sound-sleep-timer-display');
    const soundPresets = document.getElementById('sound-sleep-timer-presets');
    const soundIcon = document.getElementById('sound-sleep-timer-icon');
    
    if (soundDisplay) {
        soundDisplay.classList.toggle('hidden', !hasTimer);
    }
    if (soundPresets) {
        soundPresets.classList.toggle('hidden', hasTimer);
    }
    if (soundIcon) {
        soundIcon.style.opacity = hasTimer ? '1' : '0.6';
    }
    
    // Sidebar timer UI
    const sidebarDisplay = document.getElementById('sidebar-sleep-timer-display');
    const sidebarPresets = document.getElementById('sidebar-sleep-timer-presets');
    
    if (sidebarDisplay) {
        sidebarDisplay.classList.toggle('hidden', !hasTimer);
    }
    if (sidebarPresets) {
        sidebarPresets.classList.toggle('hidden', hasTimer);
    }
    
    // Update countdown if timer is active (this will also update button text)
    if (hasTimer) {
        updateSleepTimerCountdown();
    } else {
        // Reset button text when no timer
        const episodeText = document.getElementById('sleep-timer-text');
        const soundText = document.getElementById('sound-sleep-timer-text');
        const sidebarText = document.getElementById('sidebar-sleep-timer-text');
        if (episodeText) episodeText.textContent = 'Timer';
        if (soundText) soundText.textContent = 'Timer';
        if (sidebarText) sidebarText.textContent = 'Timer';
    }
}

// Load favorites page
function loadFavoritesPage() {
    const loadingEl = document.getElementById('favorites-loading');
    const contentEl = document.getElementById('favorites-content');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.innerHTML = '';
    
    setTimeout(() => {
        const favorites = getFavorites();
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (!contentEl) return;
        
        if (favorites.podcasts.length === 0 && favorites.episodes.length === 0 && favorites.authors.length === 0) {
            contentEl.innerHTML = '<div class="empty"><p>No favorites yet</p><p class="subtitle">Tap the heart icon on podcasts, episodes, or authors to add them to favorites</p></div>';
            return;
        }
        
        let html = '';
        
        // Render favorite authors
        if (favorites.authors.length > 0) {
            html += '<div class="favorites-section"><h2 class="favorites-section-title">Favorite Authors</h2><div class="podcast-list">';
            const favoriteAuthors = authors.filter(a => favorites.authors.includes(String(a)));
            favoriteAuthors.forEach(author => {
                const podcastCount = getAuthorPodcastCount(author);
                // Use generated author image
                const authorImageUrl = `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
                html += `
                    <div class="podcast-list-item author-list-item">
                        <div class="podcast-list-item-content" onclick="showAuthor('${escapeHtml(author)}')">
                            <div class="podcast-list-item-image">
                                <img src="${authorImageUrl}" alt="${escapeHtml(author)}" class="podcast-list-item-image-img" onerror="this.src='${authorImageUrl}';">
                            </div>
                            <div class="podcast-list-item-info">
                                <h3 class="podcast-list-item-title">${escapeHtml(author)}</h3>
                                <p class="podcast-list-item-meta">${podcastCount} ${podcastCount === 1 ? 'podcast' : 'podcasts'}</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <button class="btn-podcast-favorite-list favorited" onclick="event.stopPropagation(); toggleAuthorFavorite('${escapeHtml(author)}');" title="Remove from favorites">
                                ❤️
                            </button>
                            <button class="btn-view-author-pods" onclick="event.stopPropagation(); showAuthor('${escapeHtml(author)}');" title="View podcasts by ${escapeHtml(author)}">
                                <span>View Pods</span>
                                <span class="btn-icon">→</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }
        
        // Render favorite podcasts
        if (favorites.podcasts.length > 0) {
            html += '<div class="favorites-section"><h2 class="favorites-section-title">Favorite Podcasts</h2><div class="podcast-grid">';
            const favoritePodcasts = podcasts.filter(p => favorites.podcasts.includes(String(p.id)));
            favoritePodcasts.forEach(podcast => {
                const isFavorite = true;
                html += `
                    <div class="podcast-card">
                        <div class="podcast-card-content" onclick="openEpisodes('${podcast.id}')">
                            <div class="podcast-image-wrap">
                                <img 
                                    src="${sanitizeImageUrl(podcast.image_url) || getPlaceholderImage()}" 
                                    alt="${escapeHtml(podcast.title || 'Podcast')}"
                                    class="podcast-image"
                                    onerror="this.src='${getPlaceholderImage()}'"
                                >
                            </div>
                            <div class="podcast-info">
                                <div class="podcast-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                                ${(() => {
                                    const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
                                    return cleanedAuthor && !shouldHideAuthor(cleanedAuthor) ? `<div class="podcast-author">${escapeHtml(cleanedAuthor)}</div>` : '';
                                })()}
                            </div>
                        </div>
                        <button class="btn-podcast-favorite favorited" onclick="event.stopPropagation(); togglePodcastFavorite('${podcast.id}');" title="Remove from favorites">
                            ❤️
                        </button>
                    </div>
                `;
            });
            html += '</div></div>';
        }
        
        // Render favorite episodes
        if (favorites.episodes.length > 0) {
            html += '<div class="favorites-section"><h2 class="favorites-section-title">Favorite Episodes</h2><div class="episodes-full-page"><div class="episodes-list-content">';
            favorites.episodes.forEach(favEpisode => {
                const episode = allEpisodes.find(e => String(e.id) === favEpisode.id);
                const podcast = podcasts.find(p => String(p.id) === favEpisode.podcastId);
                if (!episode || !podcast) return '';
                
                const progress = getEpisodeProgress(episode.id);
                const isCompleted = progress >= 95; // Consider 95%+ as completed
                const progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>`;
                const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
                const isEpisodePlaying = isCurrentEpisode && isPlaying;
                
                const episodeInQueue = isInQueue(episode.id);
                html += `
                    <div class="episode-item ${isCompleted ? 'episode-completed' : ''} ${isCurrentEpisode ? 'episode-playing' : ''}" 
                         oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${podcast.id}');">
                        <div class="episode-item-image">
                            <img src="${podcast.image_url || getPlaceholderImage()}" 
                                 alt="${escapeHtml(podcast.title || '')}" 
                                 class="episode-list-artwork"
                                 onerror="this.src='${getPlaceholderImage()}'">
                        </div>
                        <button class="btn-episode-play ${isEpisodePlaying ? 'playing' : ''}" onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}" title="${isEpisodePlaying ? 'Pause' : 'Play'}">
                            <span class="episode-play-icon" data-episode-id="${episode.id}">${isEpisodePlaying ? '⏸' : '▶'}</span>
                        </button>
                        <div class="episode-item-main" onclick="openEpisodeDetail('${episode.id}', '${podcast.id}')">
                            <div class="episode-title">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                            <div class="episode-meta">
                                <span onclick="event.stopPropagation(); openEpisodes('${podcast.id}')" style="cursor: pointer; text-decoration: underline;">${escapeHtml(podcast.title || 'Unknown Podcast')}</span>
                                ${episode.pub_date ? `<span>• ${formatDate(episode.pub_date)}</span>` : ''}
                                ${episode.duration_seconds ? `<span>• ${formatDuration(episode.duration_seconds)}</span>` : ''}
                                ${progress > 0 ? `<span class="episode-progress-text">${Math.round(progress)}%</span>` : ''}
                            </div>
                            ${progressBar}
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${episodeInQueue ? '<span class="episode-queue-indicator" title="In queue">✓</span>' : ''}
                            <button class="btn-favorite favorited" onclick="event.stopPropagation(); toggleEpisodeFavorite('${episode.id}', '${podcast.id}')" title="Remove from favorites">
                                ❤️
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div></div></div>';
        }
        
        contentEl.innerHTML = html;
    }, 300);
}

// Get emoji for category/genre
function getCategoryEmoji(category) {
    // Handle "Daily" category specially
    if (category === 'Daily') {
        return '📅';
    }
    
    const categoryLower = category.toLowerCase();
    const emojiMap = {
        'technology': '💻',
        'tech': '💻',
        'business': '💼',
        'news': '📰',
        'comedy': '😂',
        'entertainment': '🎭',
        'science': '🔬',
        'health': '🏥',
        'education': '📚',
        'history': '📜',
        'true crime': '🔍',
        'sports': '⚽',
        'music': '🎵',
        'arts': '🎨',
        'culture': '🌍',
        'politics': '🏛️',
        'society': '👥',
        'storytelling': '📖',
        'interview': '🎙️',
        'discussion': '💬',
        'science fiction': '🚀',
        'fantasy': '🧙',
        'self-improvement': '💪',
        'personal development': '💪',
        'philosophy': '🤔',
        'psychology': '🧠',
        'religion': '⛪',
        'spirituality': '✨',
        'finance': '💰',
        'investing': '📈',
        'food': '🍔',
        'travel': '✈️',
        'fitness': '💪',
        'parenting': '👶',
        'relationships': '❤️',
    };
    
    // Try exact match first
    if (emojiMap[categoryLower]) {
        return emojiMap[categoryLower];
    }
    
    // Try partial match
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (categoryLower.includes(key) || key.includes(categoryLower)) {
            return emoji;
        }
    }
    
    // Default emoji
    return '🎙️';
}

// Render categories in sidebar
function renderCategories() {
    const categoriesEl = document.getElementById('sidebar-categories');
    
    if (categories.length === 0) {
        categoriesEl.innerHTML = '<p class="sidebar-empty">No categories</p>';
        return;
    }
    
    categoriesEl.innerHTML = categories.map(category => `
        <div class="sidebar-item" onclick="showCategory('${escapeHtml(category)}')">
            <span class="sidebar-item-icon">${getCategoryEmoji(category)}</span>
            <span class="sidebar-item-title">${escapeHtml(category)}</span>
            <span class="sidebar-item-count">${getCategoryCount(category)}</span>
        </div>
    `).join('');
}

// Get count of podcasts in category
function getCategoryCount(category) {
    // Handle "Daily" category specially
    if (category === 'Daily') {
        return podcasts.filter(p => isDailyPodcast(p.id)).length;
    }
    
    return podcasts.filter(p => {
        if (p.genre && Array.isArray(p.genre)) {
            return p.genre.some(g => g && g.trim() === category);
        }
        return p.genre && p.genre.trim() === category;
    }).length;
}

// Categories sorted by popularity (most podcasts first)
function getCategoriesByPopularity() {
    return [...categories].sort((a, b) => getCategoryCount(b) - getCategoryCount(a));
}

// Get podcasts for a category (same logic as showCategoryPage)
function getPodcastsForCategory(categoryName, limit = 50) {
    let list;
    if (categoryName === 'Daily') {
        list = podcasts.filter(p => isDailyPodcast(p.id));
    } else {
        list = podcasts.filter(p => {
            if (p.genre && Array.isArray(p.genre)) {
                return p.genre.some(g => g && g.trim() === categoryName);
            }
            return p.genre && p.genre.trim() === categoryName;
        });
    }
    return list.slice(0, limit);
}

// Simple string hash for seeded ordering (deterministic per day)
function hashString(str) {
    let h = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h = h & h;
    }
    return h;
}

// Daily seed: same order all day, new order next day (YYYYMMDD)
function getDailySeed() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// Shuffle array deterministically by daily seed (so it feels fresh each day)
function shuffleWithDailySeed(arr) {
    const seed = getDailySeed();
    return [...arr].sort((a, b) => {
        const ha = hashString((a.id || a) + seed);
        const hb = hashString((b.id || b) + seed);
        return ha - hb;
    });
}

// Scroll a category row left/right (called from arrow buttons)
function scrollCategoryRow(button, direction) {
    const row = button.closest('.homepage-category-row');
    if (!row) return;
    const inner = row.querySelector('.homepage-category-row-inner');
    if (!inner) return;
    const cardWidth = 200;
    const scrollAmount = cardWidth * (direction > 0 ? 1 : -1);
    inner.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// Build HTML for the Trending / Top 10 row (order rotates daily via daily seed)
// When episode counts aren't loaded yet, show 10 podcasts from a daily shuffle so the row always appears
function getTrendingRowHtml() {
    let trending = getTrendingPodcasts(10);
    if (trending.length === 0) {
        trending = shuffleWithDailySeed([...podcasts]).slice(0, 10);
    } else {
        trending = shuffleWithDailySeed(trending).slice(0, 10);
    }
    if (trending.length === 0) return '';
    const rowPodcasts = trending;
    return `
        <div class="homepage-category-row">
            <div class="homepage-section-header homepage-category-row-header">
                <h2 class="homepage-section-title">🔥 Top 10 today</h2>
                <div class="homepage-row-nav-wrap">
                    <button type="button" class="homepage-row-nav homepage-row-nav-prev" onclick="scrollCategoryRow(this, -1)" aria-label="Scroll left">‹</button>
                    <button type="button" class="homepage-row-nav homepage-row-nav-next" onclick="scrollCategoryRow(this, 1)" aria-label="Scroll right">›</button>
                </div>
            </div>
            <div class="homepage-category-row-inner">
                ${rowPodcasts.map(podcast => {
                    const isFavorite = isPodcastFavorited(podcast.id);
                    return `
                        <div class="podcast-card podcast-card-in-row">
                            <div class="podcast-card-content" onclick="openEpisodes('${podcast.id}')">
                                <div class="podcast-image-wrap">
                                    <img 
                                        src="${podcast.image_url || getPlaceholderImage()}" 
                                        alt="${escapeHtml(podcast.title || 'Podcast')}"
                                        class="podcast-image"
                                        onerror="this.src='${getPlaceholderImage()}'"
                                    >
                                </div>
                                <div class="podcast-info">
                                    <div class="podcast-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                                    ${(() => {
                                        const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
                                        if (cleanedAuthor && !shouldHideAuthor(cleanedAuthor)) {
                                            return `<div class="podcast-author">${escapeHtml(cleanedAuthor)}</div>`;
                                        }
                                        return '';
                                    })()}
                                </div>
                            </div>
                            <button class="btn-podcast-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); togglePodcastFavorite('${podcast.id}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                                ${isFavorite ? '❤️' : '🤍'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Build HTML for all category rows. Category order randomized daily; each podcast appears in at most one row.
// Always use localStorage for visible categories so the library reflects the last saved preferences.
function getCategoryRowsHtml() {
    let html = '';
    let categoriesByPopularity = getCategoriesByPopularity();
    let visibleCategories = userVisibleCategories;
    try {
        const stored = localStorage.getItem(USER_VISIBLE_CATEGORIES_KEY);
        if (stored !== null) {
            const parsed = JSON.parse(stored);
            visibleCategories = Array.isArray(parsed) ? (parsed.length > 0 ? parsed : null) : null;
        }
    } catch (e) {}
    if (visibleCategories && visibleCategories.length > 0) {
        categoriesByPopularity = categoriesByPopularity.filter(c => visibleCategories.includes(c));
    }
    const rowsToShow = categoriesByPopularity.length > 0
        ? shuffleWithDailySeed([...categoriesByPopularity])
        : ['All Podcasts'];
    const PER_ROW = 20;
    const shownInRows = new Set(); // podcast ids already placed in a previous row (no duplicates across rows)
    const MIN_PODCASTS_PER_CATEGORY = 4;
    rowsToShow.forEach(categoryName => {
        let categoryPodcasts = categoryName === 'All Podcasts'
            ? podcasts.slice(0, 80)
            : getPodcastsForCategory(categoryName, 80);
        categoryPodcasts = categoryPodcasts.filter(p => !shownInRows.has(p.id));
        if (categoryPodcasts.length < MIN_PODCASTS_PER_CATEGORY) return; // skip small categories
        categoryPodcasts = shuffleWithDailySeed(categoryPodcasts);
        const rowPodcasts = categoryPodcasts.slice(0, PER_ROW);
        rowPodcasts.forEach(p => shownInRows.add(p.id));
        const emoji = categoryName === 'All Podcasts' ? '🎙️' : getCategoryEmoji(categoryName);
        const categoryEscaped = escapeHtml(categoryName);
        const categoryAttr = String(categoryName).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const titleContent = categoryName === 'All Podcasts'
            ? `${emoji} ${categoryEscaped}`
            : `<a href="#" class="homepage-category-title-link" data-category="${categoryAttr}" onclick="event.preventDefault(); showCategory(this.getAttribute('data-category')); return false;">${emoji} ${categoryEscaped}</a>`;
        html += `
            <div class="homepage-category-row">
                <div class="homepage-section-header homepage-category-row-header">
                    <h2 class="homepage-section-title">${titleContent}</h2>
                    <div class="homepage-row-nav-wrap">
                        <button type="button" class="homepage-row-nav homepage-row-nav-prev" onclick="scrollCategoryRow(this, -1)" aria-label="Scroll left">‹</button>
                        <button type="button" class="homepage-row-nav homepage-row-nav-next" onclick="scrollCategoryRow(this, 1)" aria-label="Scroll right">›</button>
                    </div>
                </div>
                <div class="homepage-category-row-inner">
                    ${rowPodcasts.map(podcast => {
                        const isFavorite = isPodcastFavorited(podcast.id);
                        return `
                            <div class="podcast-card podcast-card-in-row">
                                <div class="podcast-card-content" onclick="openEpisodes('${podcast.id}')">
                                    <div class="podcast-image-wrap">
                                        <img 
                                            src="${podcast.image_url || getPlaceholderImage()}" 
                                            alt="${escapeHtml(podcast.title || 'Podcast')}"
                                            class="podcast-image"
                                            onerror="this.src='${getPlaceholderImage()}'"
                                        >
                                    </div>
                                    <div class="podcast-info">
                                        <div class="podcast-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                                        ${(() => {
                                            const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
                                            if (cleanedAuthor && !shouldHideAuthor(cleanedAuthor)) {
                                                return `<div class="podcast-author">${escapeHtml(cleanedAuthor)}</div>`;
                                            }
                                            return '';
                                        })()}
                                    </div>
                                </div>
                                <button class="btn-podcast-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); togglePodcastFavorite('${podcast.id}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                                    ${isFavorite ? '❤️' : '🤍'}
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    return html;
}

// Recently Listened To section HTML for Library (same structure as personalized homepage)
function getRecentlyListenedToSectionHtml() {
    const recentEpisodes = getRecentlyListenedEpisodes(8);
    if (recentEpisodes.length === 0) return '';
    return `
        <div class="homepage-section">
            <div class="homepage-section-header">
                <h2 class="homepage-section-title">Recently Listened To</h2>
                <a href="#" onclick="navigateTo('recent'); return false;" class="homepage-section-link">See All</a>
            </div>
            <div class="homepage-episodes-grid">
                ${recentEpisodes.map(({ episode, podcast, progress }) => {
                    const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
                    const isEpisodePlaying = isCurrentEpisode && isPlaying;
                    const episodeInQueue = isInQueue(episode.id);
                    return `
                        <div class="homepage-episode-card ${isCurrentEpisode ? 'episode-playing' : ''}" 
                             oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${podcast.id}');">
                            <button class="btn-remove-continue" 
                                    onclick="event.stopPropagation(); removeFromContinueListening('${episode.id}'); renderLibraryWithCategoryRows();" 
                                    title="Mark as completed">
                                ✕
                            </button>
                            <div class="homepage-episode-image" onclick="playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})">
                                <img src="${podcast.image_url || getPlaceholderImage()}" 
                                     alt="${escapeHtml(podcast.title || '')}" 
                                     onerror="this.src='${getPlaceholderImage()}'">
                                <div class="homepage-episode-overlay">
                                    <button class="btn-episode-play-small ${isEpisodePlaying ? 'playing' : ''}" 
                                            data-episode-id="${episode.id}" data-podcast-id="${podcast.id}"
                                            onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}">
                                        <span>${isEpisodePlaying ? '⏸' : '▶'}</span>
                                    </button>
                                </div>
                                <div class="homepage-episode-progress-bar">
                                    <div class="homepage-episode-progress-fill" style="width: ${progress}%"></div>
                                </div>
                            </div>
                            <div class="homepage-episode-info">
                                <div class="homepage-episode-title" onclick="openEpisodeDetail('${episode.id}', '${podcast.id}')">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                                <div class="homepage-episode-podcast" onclick="event.stopPropagation(); openEpisodes('${podcast.id}')">${escapeHtml(podcast.title || 'Unknown Podcast')}</div>
                                <div class="homepage-episode-actions">
                                    ${episodeInQueue ? '<span class="homepage-episode-queue-badge" title="In queue">✓</span>' : ''}
                                    <span class="homepage-episode-progress-text">${Math.round(progress)}%</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Library view: Recently Listened To (if any), then Top 10 today, then category rows, then full sortable grid
function renderLibraryWithCategoryRows() {
    const containerEl = document.getElementById('podcast-container');
    if (!containerEl) return;
    if (categories.length === 0) {
        extractCategories();
    }
    let html = getRecentlyListenedToSectionHtml();
    html += getTrendingRowHtml();
    html += getCategoryRowsHtml();
    html += `
        <div class="homepage-section">
            <div class="homepage-section-header">
                <h2 class="homepage-section-title">Browse All</h2>
            </div>
            <div id="podcast-grid" class="podcast-grid"></div>
        </div>
    `;
    containerEl.innerHTML = html;
    renderPodcasts(podcasts);
}

// Show category page
function showCategory(categoryName) {
    currentCategory = categoryName;
    navigateTo('category', categoryName);
}

function showCategoryPage(categoryName) {
    currentCategory = categoryName;
    
    // Update page title for this category
    updatePageTitle('category');
    
    const loadingEl = document.getElementById('category-loading');
    const gridEl = document.getElementById('category-grid');
    const titleEl = document.getElementById('category-page-title');
    const controlsEl = document.getElementById('category-controls');
    const sortSelect = document.getElementById('category-sort-select');
    
    titleEl.textContent = categoryName;
    if (controlsEl) controlsEl.classList.remove('hidden');
    if (sortSelect) sortSelect.value = sortMode === 'title-desc' ? 'title-desc' : 'title-asc';
    loadingEl.classList.remove('hidden');
    gridEl.classList.add('hidden');
    
    // Filter podcasts by category
    let filteredPodcasts;
    if (categoryName === 'Daily') {
        // Filter for Daily podcasts (200+ episodes)
        filteredPodcasts = podcasts.filter(p => isDailyPodcast(p.id));
    } else {
        filteredPodcasts = podcasts.filter(p => {
            if (p.genre && Array.isArray(p.genre)) {
                return p.genre.some(g => g && g.trim() === categoryName);
            }
            return p.genre && p.genre.trim() === categoryName;
        });
    }
    
    setTimeout(() => {
        loadingEl.classList.add('hidden');
        if (filteredPodcasts.length === 0) {
            gridEl.innerHTML = '<div class="empty"><p>No podcasts in this category</p></div>';
        } else {
            renderPodcasts(filteredPodcasts, gridEl);
        }
        gridEl.classList.remove('hidden');
    }, 300);
}

// Sort category page (A-Z or Z-A); re-renders category grid
function applyCategorySorting() {
    const sortSelect = document.getElementById('category-sort-select');
    if (sortSelect) sortMode = sortSelect.value;
    if (!currentCategory) return;
    const gridEl = document.getElementById('category-grid');
    if (!gridEl) return;
    let filteredPodcasts;
    if (currentCategory === 'Daily') {
        filteredPodcasts = podcasts.filter(p => isDailyPodcast(p.id));
    } else {
        filteredPodcasts = podcasts.filter(p => {
            if (p.genre && Array.isArray(p.genre)) {
                return p.genre.some(g => g && g.trim() === currentCategory);
            }
            return p.genre && p.genre.trim() === currentCategory;
        });
    }
    renderPodcasts(filteredPodcasts, gridEl);
}

// Load authors page
function loadAuthorsPage() {
    const loadingEl = document.getElementById('authors-loading');
    const contentEl = document.getElementById('authors-content');
    const listEl = document.getElementById('authors-list');
    
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    listEl.innerHTML = '';
    
    // Make sure authors are extracted
    if (authors.length === 0) {
        extractAuthors();
    }
    
    setTimeout(() => {
        loadingEl.classList.add('hidden');
        
        if (authors.length === 0) {
            contentEl.classList.add('hidden');
            listEl.innerHTML = '<div class="empty"><p>No authors available</p></div>';
            return;
        }
        
        contentEl.classList.remove('hidden');
        // Update sort select to match current sort mode
        const sortSelect = document.getElementById('authors-sort-select');
        if (sortSelect) {
            sortSelect.value = authorsSortMode;
        }
        renderAuthors();
        updateAuthorsCount();
    }, 300);
}

// Set authors view mode (grid or list)
function setAuthorsViewMode(mode) {
    authorsViewMode = mode;
    const gridBtn = document.getElementById('authors-view-grid');
    const listBtn = document.getElementById('authors-view-list');
    const gridEl = document.getElementById('authors-grid');
    const listEl = document.getElementById('authors-list');
    
    if (mode === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        gridEl.classList.remove('hidden');
        listEl.classList.add('hidden');
    } else {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        listEl.classList.remove('hidden');
        gridEl.classList.add('hidden');
    }
    
    renderAuthors();
}

// Render authors in list view (sorted)
function renderAuthors() {
    // Sort authors based on current sort mode
    let sortedAuthors = [...authors];
    if (authorsSortMode === 'count-desc') {
        // Sort by podcast count (most to least)
        sortedAuthors.sort((a, b) => {
            const countA = getAuthorPodcastCount(a);
            const countB = getAuthorPodcastCount(b);
            return countB - countA; // Descending order
        });
    } else if (authorsSortMode === 'name-asc') {
        // Sort alphabetically
        sortedAuthors.sort((a, b) => a.localeCompare(b));
    }
    
    if (authorsViewMode === 'grid') {
        renderAuthorsGrid(sortedAuthors);
    } else {
        renderAuthorsList(sortedAuthors);
    }
}

// Render authors in grid view (matches podcast grid style exactly)
function renderAuthorsGrid(sortedAuthors) {
    const gridEl = document.getElementById('authors-grid');
    gridEl.innerHTML = sortedAuthors.map(author => {
        const podcastCount = getAuthorPodcastCount(author);
        const isFavorite = isAuthorFavorited(author);
        const authorImageUrl = `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
        
        return `
        <div class="podcast-card">
            <div class="podcast-card-content" onclick="showAuthor('${escapeHtml(author)}')">
                <img 
                    src="${authorImageUrl}" 
                    alt="${escapeHtml(author)}"
                    class="podcast-image"
                    onerror="this.src='${authorImageUrl}'"
                >
                <div class="podcast-info">
                    <div class="podcast-title">${escapeHtml(author)}</div>
                    <div class="podcast-author">${podcastCount} ${podcastCount === 1 ? 'podcast' : 'podcasts'}</div>
                </div>
            </div>
            <button class="btn-podcast-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleAuthorFavorite('${escapeHtml(author)}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorite ? '❤️' : '🤍'}
            </button>
        </div>
    `;
    }).join('');
}

// Render authors in list view
function renderAuthorsList(sortedAuthors) {
    const listEl = document.getElementById('authors-list');
    listEl.innerHTML = '';
    
    sortedAuthors.forEach(author => {
        const podcastCount = getAuthorPodcastCount(author);
        const authorSlug = generateSlug(author);
        const isFavorite = isAuthorFavorited(author);
        // Use generated author image
        const authorImageUrl = `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
        
        // List view item with clear call-to-action button
        const listItem = document.createElement('div');
        listItem.className = 'podcast-list-item author-list-item';
        listItem.innerHTML = `
            <div class="podcast-list-item-content">
                <div class="podcast-list-item-image">
                    <img src="${authorImageUrl}" alt="${escapeHtml(author)}" class="podcast-list-item-image-img" onerror="this.src='${authorImageUrl}';">
                </div>
                <div class="podcast-list-item-info">
                    <h3 class="podcast-list-item-title">${escapeHtml(author)}</h3>
                    <p class="podcast-list-item-meta">${podcastCount} ${podcastCount === 1 ? 'podcast' : 'podcasts'}</p>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button class="btn-podcast-favorite-list ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleAuthorFavorite('${escapeHtml(author)}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
                <button class="btn-view-author-pods" onclick="showAuthor('${escapeHtml(author)}')" title="View podcasts by ${escapeHtml(author)}">
                    <span>View Pods</span>
                    <span class="btn-icon">→</span>
                </button>
            </div>
        `;
        listEl.appendChild(listItem);
    });
}

// Helper function to check if URL is from Supabase Storage
function isSupabaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('/storage/v1/object/public/') || url.includes('supabase.co/storage');
}

// Helper function to replace Supabase Storage URLs with placeholders in emergency mode
function sanitizeImageUrl(url) {
    if (!url) return getPlaceholderImage();
    // EMERGENCY MODE: Replace all Supabase Storage URLs with placeholders
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
        if (isSupabaseStorageUrl(url)) {
            console.warn('[EGRESS HALT] Replaced Supabase Storage image with placeholder:', url);
            return getPlaceholderImage();
        }
    }
    return url;
}

// Get author image URL (with caching)
const authorImageCache = {};
async function getAuthorImageUrl(author) {
    if (!author) return `/api/og-author?name=${encodeURIComponent('')}&size=profile`;
    
    // EMERGENCY MODE: Skip API call and use generated image only
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
        const fallbackUrl = `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
        authorImageCache[author] = fallbackUrl;
        return fallbackUrl;
    }
    
    // Check cache first
    if (authorImageCache[author]) {
        return authorImageCache[author];
    }
    
    try {
        const response = await fetch(`/api/author-image?name=${encodeURIComponent(author)}`);
        if (response.ok) {
            const data = await response.json();
            let imageUrl = data.imageUrl || `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
            // In emergency mode, replace Supabase Storage URLs
            if (isSupabaseStorageUrl(imageUrl)) {
                imageUrl = `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
            }
            authorImageCache[author] = imageUrl;
            return imageUrl;
        }
    } catch (error) {
        console.error('Error fetching author image:', error);
    }
    
    // Fallback to generated image
    const fallbackUrl = `/api/og-author?name=${encodeURIComponent(author)}&size=profile`;
    authorImageCache[author] = fallbackUrl;
    return fallbackUrl;
}

// Get count of podcasts by author
function getAuthorPodcastCount(author) {
    return podcasts.filter(p => {
        if (p.author && typeof p.author === 'string') {
            return p.author.trim() === author;
        }
        return false;
    }).length;
}

// Apply authors sorting
function applyAuthorsSorting() {
    const sortSelect = document.getElementById('authors-sort-select');
    if (sortSelect) {
        authorsSortMode = sortSelect.value;
        renderAuthors();
    }
}

// Update authors count
function updateAuthorsCount() {
    const countEl = document.getElementById('authors-count');
    if (countEl) {
        countEl.textContent = `${authors.length} ${authors.length === 1 ? 'author' : 'authors'}`;
    }
}

// Show author (navigate to author detail page using slug)
function showAuthor(authorName) {
    currentAuthor = authorName;
    const authorSlug = generateSlug(authorName);
    // Update URL to use slug
    window.history.pushState({ author: authorName, page: 'author' }, '', `/author/${authorSlug}`);
    
    // Track author view
    if (window.analytics) {
        const podcastCount = getAuthorPodcastCount(authorName);
        window.analytics.trackAuthorView(authorName, podcastCount);
    }
    
    navigateTo('author', authorName);
}

// Show author page (podcasts by author)
async function showAuthorPage(authorName) {
    currentAuthor = authorName;
    
    // Update page title for this author
    updatePageTitle('author');
    
    const loadingEl = document.getElementById('author-loading');
    const contentEl = document.getElementById('author-content');
    const descriptionEl = document.getElementById('author-description');
    const podcastsGridEl = document.getElementById('author-podcasts-grid');
    const titleEl = document.getElementById('author-page-title');
    
    titleEl.textContent = authorName;
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    
    // Filter podcasts by author
    const filteredPodcasts = podcasts.filter(p => {
        if (p.author && typeof p.author === 'string') {
            return p.author.trim() === authorName;
        }
        return false;
    });
    
    // Load description (from cache or API)
    let description = authorDescriptions[authorName] || null;
    
    // If not in cache, try to fetch from API
    if (!description) {
        try {
            const authorData = await apiService.fetchAuthorDescription(authorName);
            if (authorData && authorData.description) {
                description = authorData.description;
                // Cache it for future use
                authorDescriptions[authorName] = description;
            }
        } catch (error) {
            console.warn('Could not fetch author description:', error);
        }
    }
    
    setTimeout(() => {
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        
        // Display description with "see more" functionality
        if (description) {
            const fullDescription = sanitizeHtml(description);
            const originalDescription = description;
            
            // Extract first 1-2 sentences (approximately 200-250 chars or until second sentence)
            const sentences = originalDescription.match(/[^.!?]+[.!?]+/g) || [originalDescription];
            const previewText = sentences.length > 1 
                ? sentences.slice(0, 2).join(' ').trim()
                : (originalDescription.length > 250 
                    ? originalDescription.substring(0, 250).trim() + '...'
                    : originalDescription);
            const previewHtml = sanitizeHtml(previewText);
            
            // Only show toggle if preview text is actually shorter than full description
            const originalPreviewLength = previewText.length;
            const originalFullLength = originalDescription.length;
            const hasMore = originalFullLength > originalPreviewLength;
            
            descriptionEl.innerHTML = `
                <div class="author-description-content">
                    <div class="description-preview">${previewHtml}</div>
                    ${hasMore ? `
                        <!-- Full description kept in HTML for SEO but visually hidden -->
                        <div class="description-full hidden">${fullDescription}</div>
                        <button class="btn-description-toggle" onclick="window.toggleAuthorDescription(this)">
                            <span class="toggle-text">See more</span>
                            <span class="toggle-icon">▼</span>
                        </button>
                    ` : ''}
                </div>
            `;
            const placeholder = descriptionEl.querySelector('.author-description-placeholder');
            if (placeholder) placeholder.remove();
        } else {
            descriptionEl.innerHTML = '<p class="author-description-placeholder">No description available yet.</p>';
        }
        
        // Update sort select to match current sort mode
        const sortSelect = document.getElementById('author-podcasts-sort-select');
        if (sortSelect) {
            sortSelect.value = sortMode;
        }
        
        // Render podcasts
        if (filteredPodcasts.length === 0) {
            podcastsGridEl.innerHTML = '<div class="empty"><p>No podcasts by this author</p></div>';
        } else {
            renderPodcasts(filteredPodcasts, podcastsGridEl);
        }
    }, 300);
}

// Add podcast to history (when opening podcast page)
function addToHistory(podcastId) {
    const history = getHistory();
    // Remove if already exists (by podcastId, but only if no episodeId)
    const filtered = history.filter(item => !(item.podcastId === podcastId && !item.episodeId && !item.soundId));
    // Add to front
    filtered.unshift({ podcastId, timestamp: Date.now() });
    // Keep only MAX_HISTORY items
    const limited = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
    renderSidebar(); // Update sidebar
    debouncedSync(); // Sync to server if enabled
}

// Open podcast (adds to history)
function openPodcast(podcastId) {
    addToHistory(podcastId);
    renderSidebar(); // Update sidebar
    openEpisodes(podcastId);
}

// Add episode to history
function addEpisodeToHistory(episodeId, podcastId) {
    if (!episodeId || !podcastId) {
        console.warn('addEpisodeToHistory called with invalid parameters:', { episodeId, podcastId });
        return;
    }
    
    const history = getHistory();
    // Remove if already exists (deduplicate by episodeId)
    const filtered = history.filter(item => item.episodeId !== episodeId);
    // Add to front
    filtered.unshift({ episodeId, podcastId, timestamp: Date.now() });
    // Keep only MAX_HISTORY items
    const limited = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
    renderSidebar(); // Update sidebar
    debouncedSync(); // Sync to server if enabled
}

// Add sound to history
function addSoundToHistory(soundId) {
    const history = getHistory();
    // Remove if already exists
    const filtered = history.filter(item => item.soundId !== soundId);
    // Add to front
    filtered.unshift({ soundId, timestamp: Date.now() });
    // Keep only MAX_HISTORY items
    const limited = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
    renderSidebar(); // Update sidebar
    debouncedSync(); // Sync to server if enabled
}

// Clear history
function clearHistory() {
    if (confirm('Clear all listening history?')) {
        // Set empty array explicitly (not just remove key) so sync knows it was intentionally cleared
        localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
        renderSidebar();
        // Sync immediately (not debounced) to ensure empty history replaces server history
        if (syncEnabled) {
            syncToServer();
        }
        if (currentPage === 'history') {
            loadRecentlyListenedPage();
        }
    }
}

// Remove episode from continue listening (marks as completed)
function removeFromContinueListening(episodeId) {
    // Mark episode as completed (100% progress)
    saveEpisodeProgress(episodeId, 100);
    // Optionally remove from history if user wants
    // For now, just mark as completed so it won't show in continue listening
}

// Dismiss onboarding
function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
}

// Open episode detail page
function openEpisodeDetail(episodeId, podcastId) {
    let episode = allEpisodes.find(e => e.id === episodeId);
    const podcast = podcasts.find(p => p.id === podcastId);
    
    // If episode not found in allEpisodes, check the cache
    if (!episode && podcast && episodesCache[podcast.id]) {
        episode = episodesCache[podcast.id].find(e => e.id === episodeId);
    }
    
    if (!episode || !podcast) {
        console.error('Episode or podcast not found:', { episodeId, podcastId, episode, podcast });
        return;
    }
    
    displayedEpisode = episode; // Store the episode being viewed separately
    currentPodcast = podcast; // Keep currentPodcast for navigation context
    
    // Update URL with podcast slug (keep it at podcast page, not episode-specific URL)
    const slug = generateSlug(podcast.title || '');
    window.history.pushState({ episodeId: episodeId, podcastId: podcastId, page: 'episode' }, '', `/podcast/${slug}`);
    
    navigateTo('episode');
    // Update title after navigation
    setTimeout(() => updatePageTitle('episode'), 100);
}

// Handle URL parameters from SEO pages (e.g., ?episode=123&podcast=456)
function handleURLParams() {
    let path = window.location.pathname;
    
    // Check for _route query param (from middleware redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const routeParam = urlParams.get('_route');
    if (routeParam) {
        path = routeParam;
        // Clean up the URL by removing the query param
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('_route');
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
    
    // Check sessionStorage for a pending route (from 404 redirect or SEO page)
    const pendingRoute = sessionStorage.getItem('pendingRoute');
    if (pendingRoute) {
        path = pendingRoute;
        sessionStorage.removeItem('pendingRoute');
    }
    
    // Check for /podcast/[slug] path
    const podcastMatch = path.match(/^\/podcast\/([^\/]+)/);
    if (podcastMatch) {
        const slug = podcastMatch[1];
        const podcast = podcasts.find(p => generateSlug(p.title || '') === slug);
        if (podcast) {
            currentPodcast = podcast;
            // Update URL to match the path
            window.history.replaceState({ podcastId: podcast.id, page: 'episodes' }, '', path);
            navigateTo('episodes');
            loadEpisodesPage();
            return;
        }
    }
    
    // Check for /author/[slug] path
    const authorMatch = path.match(/^\/author\/([^\/]+)/);
    if (authorMatch) {
        const slug = authorMatch[1];
        // Make sure authors are extracted
        if (authors.length === 0) {
            extractAuthors();
        }
        const author = authors.find(a => generateSlug(a) === slug);
        if (author) {
            // Update URL to match the path
            window.history.replaceState({ author: author, page: 'author' }, '', path);
            showAuthorPage(author);
            return;
        }
    }
    
    // Handle query parameters
    const episodeId = urlParams.get('episode');
    const podcastId = urlParams.get('podcast');
    
    if (episodeId && podcastId) {
        // Open the episode detail page
        openEpisodeDetail(episodeId, podcastId);
        // Clean up URL - keep current path or go to podcast slug
        const podcast = podcasts.find(p => p.id === podcastId);
        if (podcast) {
            const slug = generateSlug(podcast.title || '');
            window.history.replaceState({}, document.title, `/podcast/${slug}`);
        } else {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else if (podcastId) {
        // Just open the podcast episodes page
        const podcast = podcasts.find(p => p.id === podcastId);
        if (podcast) {
            currentPodcast = podcast;
            const slug = generateSlug(podcast.title || '');
            navigateTo('episodes');
            window.history.replaceState({}, document.title, `/podcast/${slug}`);
            loadEpisodesPage();
        }
    }
}

// Load episode detail page
function loadEpisodeDetailPage() {
    if (!displayedEpisode || !currentPodcast) return;
    
    // Update page title for this episode
    updatePageTitle('episode');
    
    const contentEl = document.getElementById('episode-detail-content');
    const titleEl = document.getElementById('episode-page-title');
    
    titleEl.textContent = displayedEpisode.title || 'Episode';
    const progress = getEpisodeProgress(displayedEpisode.id);
    
    // Check if this episode is currently playing
    // Compare the displayed episode with the currently playing episode
    let isCurrentlyPlaying = false;
    if (displayedEpisode && currentEpisode && isPlaying) {
        isCurrentlyPlaying = displayedEpisode.id === currentEpisode.id;
    }
    
    const isFavorite = isEpisodeFavorited(displayedEpisode.id);
    const episodeInQueue = isInQueue(displayedEpisode.id);
    contentEl.innerHTML = `
        <div class="episode-detail">
            <div class="episode-detail-header">
                <img src="${sanitizeImageUrl(currentPodcast.image_url) || getPlaceholderImage()}" alt="${escapeHtml(currentPodcast.title || '')}" class="episode-detail-artwork" onerror="this.src='${getPlaceholderImage()}'">
                <div class="episode-detail-info">
                    <h2>${escapeHtml(displayedEpisode.title || 'Untitled Episode')}</h2>
                    <p class="episode-detail-podcast" onclick="openEpisodes('${currentPodcast.id}')">${escapeHtml(currentPodcast.title || 'Unknown Podcast')}</p>
                    <div class="episode-detail-meta">
                        ${displayedEpisode.pub_date ? `<span>${formatDate(displayedEpisode.pub_date)}</span>` : ''}
                        ${displayedEpisode.duration_seconds ? `<span>• ${formatDuration(displayedEpisode.duration_seconds)}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="episode-detail-controls">
                <button id="episode-detail-play-btn" class="btn-play-large ${isCurrentlyPlaying ? 'playing' : ''}" onclick="${isCurrentlyPlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(displayedEpisode).replace(/"/g, '&quot;')})`}">
                    <span id="episode-detail-play-icon">${isCurrentlyPlaying ? '⏸' : '▶'}</span> <span id="episode-detail-play-text">${isCurrentlyPlaying ? 'Pause' : 'Play Episode'}</span>
                </button>
                <button class="btn-queue-episode-detail ${episodeInQueue ? 'in-queue' : ''}" onclick="${episodeInQueue ? `removeFromQueue('${displayedEpisode.id}')` : `addToQueue('${displayedEpisode.id}', '${currentPodcast.id}')`}; loadEpisodeDetailPage(); renderSidebar();" title="${episodeInQueue ? 'Remove from queue' : 'Add to queue'}">
                    ${episodeInQueue ? '✓ In Queue' : '+ Add to Queue'}
                </button>
                <button class="btn-favorite-episode-detail ${isFavorite ? 'favorited' : ''}" onclick="toggleEpisodeFavorite('${displayedEpisode.id}', '${currentPodcast.id}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
            </div>
            ${displayedEpisode.description ? `<div class="episode-detail-description">${sanitizeHtml(displayedEpisode.description)}</div>` : ''}
            ${progress > 0 && progress < 100 ? `
                <div class="episode-detail-progress">
                    <div class="progress-bar-large">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="episode-detail-progress-text">
                        <span>${Math.round(progress)}% complete</span>
                        <span>Resume from ${formatTime((progress / 100) * (displayedEpisode.duration_seconds || 0))}</span>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Go back from episode detail
function goBackFromEpisode() {
    if (currentPodcast) {
        const slug = generateSlug(currentPodcast.title || '');
        window.history.pushState({ podcastId: currentPodcast.id, page: 'episodes' }, '', `/podcast/${slug}`);
        navigateTo('episodes');
    } else {
        window.history.pushState({ page: 'grid' }, '', '/web/');
        navigateTo('grid');
    }
}

// Get history
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

// ========== QUEUE MANAGEMENT ==========

// Get queue from localStorage
function getQueue() {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

// Save queue to localStorage
function saveQueue() {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(episodeQueue));
        debouncedSync();
    } catch (e) {
        console.error('Error saving queue:', e);
    }
}

// Restore queue from localStorage
function restoreQueue() {
    episodeQueue = getQueue();
}

// Add episode to queue
function addToQueue(episodeId, podcastId) {
    if (!episodeId || !podcastId) return;
    
    // Check if already in queue
    if (episodeQueue.find(item => item.episodeId === episodeId)) {
        return; // Already in queue
    }
    
    episodeQueue.push({ episodeId, podcastId, addedAt: Date.now() });
    saveQueue();
    renderSidebar(); // Update sidebar count
}

// Remove episode from queue
function removeFromQueue(episodeId) {
    episodeQueue = episodeQueue.filter(item => item.episodeId !== episodeId);
    saveQueue();
    renderSidebar(); // Update sidebar count
}

// Clear queue
function clearQueue() {
    if (confirm('Clear all episodes from queue?')) {
        episodeQueue = [];
        saveQueue();
        renderSidebar(); // Update sidebar count
    }
}

// Check if episode is in queue
function isInQueue(episodeId) {
    return episodeQueue.some(item => item.episodeId === episodeId);
}

// Play next episode in queue
async function playNextInQueue() {
    if (episodeQueue.length === 0) {
        // If queue is empty, try to play next episode from same podcast
        if (currentPodcast && currentEpisode) {
            await playNextEpisodeInPodcast();
        }
        return;
    }
    
    const nextItem = episodeQueue.shift();
    saveQueue();
    
    // Find the episode
    let episode = allEpisodes.find(e => e.id === nextItem.episodeId);
    
    // If not in allEpisodes, try to load from cache
    if (!episode && episodesCache[nextItem.podcastId]) {
        episode = episodesCache[nextItem.podcastId].find(e => e.id === nextItem.episodeId);
    }
    
    // If still not found, try to fetch it
    if (!episode && nextItem.podcastId) {
        try {
            const podcast = podcasts.find(p => p.id === nextItem.podcastId);
            if (podcast && !episodesCache[podcast.id]) {
                await loadEpisodesForPodcast(podcast.id);
            }
            if (episodesCache[nextItem.podcastId]) {
                episode = episodesCache[nextItem.podcastId].find(e => e.id === nextItem.episodeId);
            }
        } catch (e) {
            console.error('Error loading episode for queue:', e);
        }
    }
    
    if (episode) {
        playEpisode(episode);
    }
}

// Play next episode in same podcast (for auto-play)
async function playNextEpisodeInPodcast() {
    if (!currentPodcast || !currentEpisode) return;
    
    // Load episodes if not cached
    if (!episodesCache[currentPodcast.id]) {
        await loadEpisodesForPodcast(currentPodcast.id);
    }
    
    const episodes = episodesCache[currentPodcast.id] || [];
    if (episodes.length === 0) return;
    
    // Sort by date (newest first) to find next episode
    const sortedEpisodes = [...episodes].sort((a, b) => {
        const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
        const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
        return dateB - dateA;
    });
    
    const currentIndex = sortedEpisodes.findIndex(e => e.id === currentEpisode.id);
    if (currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1) {
        const nextEpisode = sortedEpisodes[currentIndex + 1];
        playEpisode(nextEpisode);
    }
}

// Load episodes for a podcast (helper function)
async function loadEpisodesForPodcast(podcastId) {
    if (episodesCache[podcastId]) {
        return episodesCache[podcastId];
    }
    
    try {
        const episodes = await apiService.fetchEpisodesByPodcastId(podcastId);
        episodesCache[podcastId] = episodes;
        return episodes;
    } catch (e) {
        console.error('Error loading episodes:', e);
        return [];
    }
}

// Restore auto-play setting
function restoreAutoPlaySetting() {
    try {
        const stored = localStorage.getItem(AUTO_PLAY_KEY);
        autoPlayEnabled = stored !== null ? stored === 'true' : true; // Default to true
    } catch (e) {
        autoPlayEnabled = true;
    }
}

// Restore playback settings (speed and volume)
function restorePlaybackSettings() {
    try {
        const storedSpeed = localStorage.getItem(PLAYBACK_SPEED_KEY);
        if (storedSpeed) {
            playbackSpeed = parseFloat(storedSpeed);
        }
        const storedVolume = localStorage.getItem(VOLUME_KEY);
        if (storedVolume) {
            volume = parseFloat(storedVolume);
        }
        // Apply to audio player if it exists
        if (audioPlayer) {
            audioPlayer.playbackRate = playbackSpeed;
            audioPlayer.volume = volume;
        }
        updatePlaybackSpeedUI();
        updateVolumeUI();
    } catch (e) {
        console.error('Error restoring playback settings:', e);
    }
}

// Set playback speed
function setPlaybackSpeed(speed) {
    playbackSpeed = speed;
    if (audioPlayer) {
        audioPlayer.playbackRate = speed;
    }
    localStorage.setItem(PLAYBACK_SPEED_KEY, String(speed));
    updatePlaybackSpeedUI();
    closePlaybackSpeedMenu();
}

// Update playback speed UI
function updatePlaybackSpeedUI() {
    const speedText = document.getElementById('playback-speed-text');
    if (speedText) {
        speedText.textContent = `${playbackSpeed}x`;
    }
    // Update active state in menu
    const menu = document.getElementById('playback-speed-menu');
    if (menu) {
        menu.querySelectorAll('.player-control-option').forEach(btn => {
            btn.classList.remove('active');
            const speed = parseFloat(btn.textContent.replace('x', ''));
            if (speed === playbackSpeed) {
                btn.classList.add('active');
            }
        });
    }
}

// Toggle playback speed menu
function togglePlaybackSpeedMenu() {
    const menu = document.getElementById('playback-speed-menu');
    if (menu) {
        menu.classList.toggle('hidden');
        // Close other menus
        closeVolumeControl();
        closeSleepTimerMenu();
    }
}

// Close playback speed menu
function closePlaybackSpeedMenu() {
    const menu = document.getElementById('playback-speed-menu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

// Set volume
function setVolume(vol) {
    volume = Math.max(0, Math.min(1, vol)); // Clamp between 0 and 1
    if (audioPlayer) {
        audioPlayer.volume = volume;
    }
    localStorage.setItem(VOLUME_KEY, String(volume));
    updateVolumeUI();
}

// Update volume UI
function updateVolumeUI() {
    const volumeIcon = document.getElementById('volume-icon');
    const volumeSlider = document.getElementById('volume-slider');
    
    if (volumeIcon) {
        if (volume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volume < 0.5) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
    }
    
    if (volumeSlider) {
        volumeSlider.value = Math.round(volume * 100);
    }
}

// Toggle volume control
function toggleVolumeControl() {
    const control = document.getElementById('volume-control');
    if (control) {
        control.classList.toggle('hidden');
        // Close other menus
        closePlaybackSpeedMenu();
        closeSleepTimerMenu();
    }
}

// Close volume control
function closeVolumeControl() {
    const control = document.getElementById('volume-control');
    if (control) {
        control.classList.add('hidden');
    }
}

// ========== CONTEXT MENU ==========

// Show context menu for episodes
function showEpisodeContextMenu(event, episodeId, podcastId) {
    // Remove existing context menu
    const existing = document.getElementById('episode-context-menu');
    if (existing) {
        existing.remove();
    }
    
    const episode = allEpisodes.find(e => e.id === episodeId) || 
                   (episodesCache[podcastId] ? episodesCache[podcastId].find(e => e.id === episodeId) : null);
    const podcast = podcasts.find(p => p.id === podcastId);
    
    if (!episode || !podcast) return;
    
    const inQueue = isInQueue(episodeId);
    const isFavorite = isEpisodeFavorited(episodeId);
    const isCurrentEpisode = currentEpisode && currentEpisode.id === episodeId;
    
    const menu = document.createElement('div');
    menu.id = 'episode-context-menu';
    menu.className = 'episode-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.zIndex = '1000';
    
    menu.innerHTML = `
        <div class="context-menu-item" onclick="playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')}); closeContextMenu();">
            <span class="context-menu-icon">▶️</span>
            <span>Play Now</span>
        </div>
        <div class="context-menu-item" onclick="${inQueue ? `removeFromQueue('${episodeId}')` : `addToQueue('${episodeId}', '${podcastId}')`}; closeContextMenu(); renderSidebar();">
            <span class="context-menu-icon">${inQueue ? '✓' : '+'}</span>
            <span>${inQueue ? 'Remove from Queue' : 'Add to Queue'}</span>
        </div>
        <div class="context-menu-item" onclick="toggleEpisodeFavorite('${episodeId}', '${podcastId}'); closeContextMenu();">
            <span class="context-menu-icon">${isFavorite ? '❤️' : '🤍'}</span>
            <span>${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
        </div>
        <div class="context-menu-item" onclick="openEpisodeDetail('${episodeId}', '${podcastId}'); closeContextMenu();">
            <span class="context-menu-icon">ℹ️</span>
            <span>View Details</span>
        </div>
        <div class="context-menu-item" onclick="openEpisodes('${podcastId}'); closeContextMenu();">
            <span class="context-menu-icon">📚</span>
            <span>Go to Podcast</span>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu, { once: true });
    }, 0);
}

// Close context menu
function closeContextMenu() {
    const menu = document.getElementById('episode-context-menu');
    if (menu) {
        menu.remove();
    }
}

// Toggle auto-play
function toggleAutoPlay() {
    autoPlayEnabled = !autoPlayEnabled;
    localStorage.setItem(AUTO_PLAY_KEY, String(autoPlayEnabled));
    return autoPlayEnabled;
}

// ========== CONTINUE LISTENING ==========

// Get continue listening episodes (episodes with progress but not completed)
function getContinueListeningEpisodes(limit = 10) {
    const history = getHistory();
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    
    const continueEpisodes = history
        .filter(item => item.episodeId && progress[item.episodeId] && progress[item.episodeId].progress < 95)
        .map(item => {
            const episode = allEpisodes.find(e => e.id === item.episodeId);
            if (!episode) return null;
            const podcast = podcasts.find(p => p.id === item.podcastId);
            if (!podcast) return null;
            return {
                episode,
                podcast,
                progress: progress[item.episodeId].progress,
                timestamp: item.timestamp
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    return continueEpisodes;
}

// Get recently listened episodes (all history, most recent first; includes progress)
function getRecentlyListenedEpisodes(limit = 50) {
    const history = getHistory();
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const items = history
        .filter(item => item.episodeId)
        .map(item => {
            const episode = allEpisodes.find(e => e.id === item.episodeId);
            if (!episode) return null;
            const podcast = podcasts.find(p => p.id === item.podcastId);
            if (!podcast) return null;
            const epProgress = progress[item.episodeId] ? progress[item.episodeId].progress : 0;
            return {
                episode,
                podcast,
                progress: epProgress,
                timestamp: item.timestamp
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    return items;
}

// ========== RECOMMENDATIONS ==========

// Get personalized recommendations
function getRecommendations(limit = 12) {
    const favorites = getFavorites();
    const history = getHistory();
    
    // Get favorite podcast IDs
    const favoritePodcastIds = new Set([
        ...favorites.podcasts,
        ...history.filter(h => h.podcastId).map(h => h.podcastId)
    ]);
    
    // Get genres from favorites
    const favoriteGenres = new Set();
    favorites.podcasts.forEach(podcastId => {
        const podcast = podcasts.find(p => p.id === podcastId);
        if (podcast && podcast.genre) {
            const genres = Array.isArray(podcast.genre) ? podcast.genre : [podcast.genre];
            genres.forEach(g => g && favoriteGenres.add(g.trim().toLowerCase()));
        }
    });
    
    // Find similar podcasts (same genres, not already favorited)
    const recommendations = podcasts
        .filter(p => !favoritePodcastIds.has(p.id))
        .map(podcast => {
            let score = 0;
            const genres = Array.isArray(podcast.genre) ? podcast.genre : [podcast.genre];
            
            // Score based on genre match
            genres.forEach(g => {
                if (g && favoriteGenres.has(g.trim().toLowerCase())) {
                    score += 10;
                }
            });
            
            // Boost score for podcasts with many episodes
            const episodeCount = getPodcastEpisodeCount(podcast.id);
            if (episodeCount > 50) score += 5;
            if (episodeCount > 100) score += 5;
            
            return { podcast, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.podcast);
    
    return recommendations;
}

// Get new episodes from favorite podcasts
function getNewEpisodesFromFavorites(limit = 10) {
    const favorites = getFavorites();
    if (favorites.podcasts.length === 0 || allEpisodes.length === 0) {
        return [];
    }
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const newEpisodes = allEpisodes
        .filter(episode => {
            const podcast = podcasts.find(p => p.id === episode.podcast_id);
            if (!podcast) return false;
            
            // Check if podcast is favorited
            if (!favorites.podcasts.includes(episode.podcast_id)) return false;
            
            // Check if episode is recent (within last week)
            if (!episode.pub_date) return false;
            const pubDate = new Date(episode.pub_date).getTime();
            return pubDate >= oneWeekAgo;
        })
        .sort((a, b) => {
            const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
            const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, limit)
        .map(episode => {
            const podcast = podcasts.find(p => p.id === episode.podcast_id);
            return { episode, podcast };
        });
    
    return newEpisodes;
}

// Get trending podcasts (most episodes = most popular)
function getTrendingPodcasts(limit = 12) {
    return podcasts
        .map(podcast => ({
            podcast,
            episodeCount: getPodcastEpisodeCount(podcast.id)
        }))
        .filter(item => item.episodeCount > 0)
        .sort((a, b) => b.episodeCount - a.episodeCount)
        .slice(0, limit)
        .map(item => item.podcast);
}

// Load all episodes for search (lazy-loaded only when needed)
let episodesLoading = false;
let episodesLoaded = false;
async function loadAllEpisodes() {
    // If already loaded, return immediately
    if (episodesLoaded && allEpisodes.length > 0) {
        return;
    }
    
    // If already loading, wait for it
    if (episodesLoading) {
        while (episodesLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return;
    }
    
    // EMERGENCY MODE: Disable fetchAllEpisodes to halt egress
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
        console.warn('[EGRESS HALT] fetchAllEpisodes disabled - using empty array');
        allEpisodes = [];
        episodesLoaded = true;
        return;
    }
    
    episodesLoading = true;
    try {
        const episodes = await apiService.fetchAllEpisodes();
        // Enrich with podcast info
        allEpisodes = episodes.map(ep => {
            const podcast = podcasts.find(p => p.id === ep.podcast_id);
            return { ...ep, podcast_title: podcast?.title || 'Unknown Podcast', podcast_image: podcast?.image_url };
        });
        
        episodesLoaded = true;
        
        // Re-extract categories to include "Daily" if any podcast now has 200+ episodes
        extractCategories();
        extractAuthors();
        renderSidebar();
    } catch (error) {
        console.error('Error loading all episodes:', error);
        episodesLoaded = false; // Allow retry on error
    } finally {
        episodesLoading = false;
    }
}

// Get episode count for a podcast
function getPodcastEpisodeCount(podcastId) {
    // First check allEpisodes (comprehensive list)
    let count = allEpisodes.filter(ep => ep.podcast_id === podcastId).length;
    
    // If count is 0, check the episodes cache (in case episodes were loaded individually)
    if (count === 0 && episodesCache[podcastId]) {
        count = episodesCache[podcastId].length;
    }
    
    // If we found episodes in cache but not in allEpisodes, update allEpisodes
    if (count > 0 && episodesCache[podcastId] && allEpisodes.filter(ep => ep.podcast_id === podcastId).length === 0) {
        // Add episodes from cache to allEpisodes if they're not already there
        episodesCache[podcastId].forEach(episode => {
            if (!allEpisodes.find(e => e.id === episode.id)) {
                const podcast = podcasts.find(p => p.id === episode.podcast_id);
                allEpisodes.push({
                    ...episode,
                    podcast_title: podcast?.title || 'Unknown Podcast',
                    podcast_image: podcast?.image_url
                });
            }
        });
        // Recalculate count from updated allEpisodes
        count = allEpisodes.filter(ep => ep.podcast_id === podcastId).length;
    }
    
    return count;
}

// Check if a podcast is a "Daily" podcast (200+ episodes)
function isDailyPodcast(podcastId) {
    const count = getPodcastEpisodeCount(podcastId);
    return count >= 200;
}

// Get episode count display text (Daily for 200+, count for limited series)
function getEpisodeCountDisplay(podcastId) {
    const count = getPodcastEpisodeCount(podcastId);
    if (count === 0) return null;
    if (count >= 200) {
        return 'Daily';
    }
    return `${count} ${count === 1 ? 'episode' : 'episodes'}`;
}

// Words to exclude from author names
const EXCLUDED_AUTHOR_WORDS = [
    'sol good media',
    'sol good network',
    'public domain',
    'solgoodmedia',
    'solgoodnetwork',
    'solgoodmedia.com'
];

// Check if author should be hidden (entire author name matches excluded words)
function shouldHideAuthor(author) {
    if (!author) return true;
    const authorLower = author.toLowerCase().trim();
    
    // Exclude authors containing ".com"
    if (authorLower.includes('.com')) {
        return true;
    }
    
    return EXCLUDED_AUTHOR_WORDS.some(word => authorLower === word);
}

// Clean author text by removing excluded words
function cleanAuthorText(author) {
    if (!author) return '';
    let cleaned = author.trim();
    
    // Decode HTML entities (like &amp; to &)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleaned;
    cleaned = tempDiv.textContent || tempDiv.innerText || cleaned;
    
    // Replace & with "and" for better readability (e.g., "Lawrence & Leslie" -> "Lawrence and Leslie")
    cleaned = cleaned.replace(/\s*&\s*/g, ' and ');
    
    // Remove excluded words/phrases from the author text
    EXCLUDED_AUTHOR_WORDS.forEach(word => {
        // Remove word if it appears standalone (case insensitive)
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '').trim();
    });
    
    // Clean up extra spaces and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim();
    
    return cleaned;
}

// Get related podcasts by genre (client-side filtering from existing podcasts array)
function getRelatedPodcastsByGenre(currentPodcastId, genres, limit = 6) {
    if (!genres || !podcasts || podcasts.length === 0) {
        console.log('[Suggested Pods] No genres or podcasts available', { genres, podcastCount: podcasts?.length });
        return [];
    }
    
    // Normalize genres to array
    const genreArray = Array.isArray(genres) 
        ? genres.filter(g => g).map(g => String(g).trim().toLowerCase())
        : genres 
            ? [String(genres).trim().toLowerCase()]
            : [];
    
    if (genreArray.length === 0) {
        console.log('[Suggested Pods] No valid genres after normalization');
        return [];
    }
    
    console.log('[Suggested Pods] Looking for podcasts with genres:', genreArray);
    
    // Filter podcasts by genre match, excluding current podcast
    const related = podcasts
        .filter(p => {
            // Exclude current podcast and private podcasts
            if (String(p.id) === String(currentPodcastId)) {
                return false;
            }
            if (p.is_private) {
                return false;
            }
            
            const pGenres = Array.isArray(p.genre)
                ? p.genre.filter(g => g).map(g => String(g).trim().toLowerCase())
                : p.genre
                    ? [String(p.genre).trim().toLowerCase()]
                    : [];
            
            // Check if any genre matches
            const hasMatch = pGenres.some(g => genreArray.includes(g));
            if (hasMatch) {
                console.log('[Suggested Pods] Found match:', p.title, 'with genres:', pGenres);
            }
            return hasMatch;
        })
        .slice(0, limit);
    
    console.log('[Suggested Pods] Found', related.length, 'related podcasts');
    return related;
}

// Sort podcasts based on current sort mode
function sortPodcasts(podcastsToSort) {
    const sorted = [...podcastsToSort];
    
    switch (sortMode) {
        case 'title-asc':
            sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
            break;
        case 'title-desc':
            sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleB.localeCompare(titleA);
            });
            break;
        case 'random':
            // Fisher-Yates shuffle algorithm
            for (let i = sorted.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
            }
            break;
    }
    
    return sorted;
}

// Set view mode (grid only - list view removed)
function setViewMode(mode) {
    viewMode = mode;
    const currentPodcasts = currentCategory 
        ? podcasts.filter(p => {
            if (p.genre && Array.isArray(p.genre)) {
                return p.genre.some(g => g && g.trim() === currentCategory);
            }
            return p.genre && p.genre.trim() === currentCategory;
        })
        : podcasts;
    renderPodcasts(currentPodcasts);
}

// Apply sorting (used by category and other views; Library has no sort control)
function applySorting() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortMode = sortSelect.value;
    
    // Re-render with sorted podcasts
    const currentPodcasts = currentCategory 
        ? podcasts.filter(p => {
            if (p.genre && Array.isArray(p.genre)) {
                return p.genre.some(g => g && g.trim() === currentCategory);
            }
            return p.genre && p.genre.trim() === currentCategory;
        })
        : podcasts;
    
    renderPodcasts(currentPodcasts);
}

// Apply sorting for author podcasts page
function applyAuthorPodcastsSorting() {
    const sortSelect = document.getElementById('author-podcasts-sort-select');
    if (sortSelect) {
        sortMode = sortSelect.value;
        
        // Re-render author podcasts
        if (currentAuthor) {
            const filteredPodcasts = podcasts.filter(p => {
                if (p.author && typeof p.author === 'string') {
                    return p.author.trim() === currentAuthor;
                }
                return false;
            });
            const podcastsGridEl = document.getElementById('author-podcasts-grid');
            if (podcastsGridEl) {
                renderPodcasts(filteredPodcasts, podcastsGridEl);
            }
        }
    }
}

// Update podcast count display (removed - showing inaccurate count due to 1000 limit)
function updatePodcastCount() {
    // Podcast count removed - API returns limited results (1000) but total is 1300+
    // Hide the count element instead of showing inaccurate count
    const countEl = document.getElementById('podcast-count');
    if (countEl) {
        countEl.style.display = 'none';
    }
}

// Render podcast grid
// Render personalized homepage with continue listening, category rows, etc.
async function renderPersonalizedHomepage() {
    const containerEl = document.getElementById('podcast-container');
    if (!containerEl) return;
    
    if (categories.length === 0) {
        extractCategories();
    }
    
    // Load episodes if needed for continue listening
    if (!episodesLoaded && allEpisodes.length === 0) {
        await loadAllEpisodes();
    }
    
    let html = '';
    
    // Check if first-time visitor (no history, no favorites)
    const history = getHistory();
    const favorites = getFavorites();
    const hasActivity = history.length > 0 || favorites.podcasts.length > 0 || favorites.episodes.length > 0;
    const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
    
    // Show onboarding for first-time visitors
    if (!hasActivity && !onboardingCompleted) {
        html += `
            <div class="homepage-onboarding">
                <div class="onboarding-content">
                    <h2>Welcome to Podcast Library! 🎧</h2>
                    <p>Discover and listen to thousands of podcasts. Here's how to get started:</p>
                    <div class="onboarding-steps">
                        <div class="onboarding-step">
                            <div class="onboarding-step-icon">🔍</div>
                            <div class="onboarding-step-content">
                                <h3>Search</h3>
                                <p>Use the search bar to find podcasts you love</p>
                            </div>
                        </div>
                        <div class="onboarding-step">
                            <div class="onboarding-step-icon">⭐</div>
                            <div class="onboarding-step-content">
                                <h3>Favorite</h3>
                                <p>Click the heart icon to save your favorite podcasts</p>
                            </div>
                        </div>
                        <div class="onboarding-step">
                            <div class="onboarding-step-icon">▶️</div>
                            <div class="onboarding-step-content">
                                <h3>Listen</h3>
                                <p>Play episodes and we'll track your progress automatically</p>
                            </div>
                        </div>
                    </div>
                    <button class="btn-onboarding-dismiss" onclick="dismissOnboarding(); renderPersonalizedHomepage();">Got it!</button>
                </div>
            </div>
        `;
    }
    
    // Recently Listened To Section
    const recentEpisodes = getRecentlyListenedEpisodes(8);
    if (recentEpisodes.length > 0) {
        html += `
            <div class="homepage-section">
                <div class="homepage-section-header">
                    <h2 class="homepage-section-title">Recently Listened To</h2>
                    <a href="#" onclick="navigateTo('recent'); return false;" class="homepage-section-link">See All</a>
                </div>
                <div class="homepage-episodes-grid">
                    ${recentEpisodes.map(({ episode, podcast, progress }) => {
                        const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
                        const isEpisodePlaying = isCurrentEpisode && isPlaying;
                        const episodeInQueue = isInQueue(episode.id);
                        return `
                            <div class="homepage-episode-card ${isCurrentEpisode ? 'episode-playing' : ''}" 
                                 oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${podcast.id}');">
                                <button class="btn-remove-continue" 
                                        onclick="event.stopPropagation(); removeFromContinueListening('${episode.id}'); renderPersonalizedHomepage();" 
                                        title="Mark as completed">
                                    ✕
                                </button>
                                <div class="homepage-episode-image" onclick="playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})">
                                    <img src="${podcast.image_url || getPlaceholderImage()}" 
                                         alt="${escapeHtml(podcast.title || '')}" 
                                         onerror="this.src='${getPlaceholderImage()}'">
                                    <div class="homepage-episode-overlay">
                                        <button class="btn-episode-play-small ${isEpisodePlaying ? 'playing' : ''}" 
                                                data-episode-id="${episode.id}" data-podcast-id="${podcast.id}"
                                                onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}">
                                            <span>${isEpisodePlaying ? '⏸' : '▶'}</span>
                                        </button>
                                    </div>
                                    <div class="homepage-episode-progress-bar">
                                        <div class="homepage-episode-progress-fill" style="width: ${progress}%"></div>
                                    </div>
                                </div>
                                <div class="homepage-episode-info">
                                    <div class="homepage-episode-title" onclick="openEpisodeDetail('${episode.id}', '${podcast.id}')">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                                    <div class="homepage-episode-podcast" onclick="event.stopPropagation(); openEpisodes('${podcast.id}')">${escapeHtml(podcast.title || 'Unknown Podcast')}</div>
                                    <div class="homepage-episode-actions">
                                        ${episodeInQueue ? '<span class="homepage-episode-queue-badge" title="In queue">✓</span>' : ''}
                                        <span class="homepage-episode-progress-text">${Math.round(progress)}%</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // New Episodes from Favorites
    const newEpisodes = getNewEpisodesFromFavorites(8);
    if (newEpisodes.length > 0) {
        html += `
            <div class="homepage-section">
                <div class="homepage-section-header">
                    <h2 class="homepage-section-title">New from Your Favorites</h2>
                </div>
                <div class="homepage-episodes-grid">
                    ${newEpisodes.map(({ episode, podcast }) => {
                        const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
                        const isEpisodePlaying = isCurrentEpisode && isPlaying;
                        const episodeInQueue = isInQueue(episode.id);
                        return `
                            <div class="homepage-episode-card ${isCurrentEpisode ? 'episode-playing' : ''}" 
                                 oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${podcast.id}');">
                                <div class="homepage-episode-image" onclick="playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})">
                                    <img src="${podcast.image_url || getPlaceholderImage()}" 
                                         alt="${escapeHtml(podcast.title || '')}" 
                                         onerror="this.src='${getPlaceholderImage()}'">
                                    <div class="homepage-episode-overlay">
                                        <button class="btn-episode-play-small ${isEpisodePlaying ? 'playing' : ''}" 
                                                data-episode-id="${episode.id}" data-podcast-id="${podcast.id}"
                                                onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}">
                                            <span>${isEpisodePlaying ? '⏸' : '▶'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="homepage-episode-info">
                                    <div class="homepage-episode-title" onclick="openEpisodeDetail('${episode.id}', '${podcast.id}')">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                                    <div class="homepage-episode-podcast" onclick="event.stopPropagation(); openEpisodes('${podcast.id}')">${escapeHtml(podcast.title || 'Unknown Podcast')}</div>
                                    <div class="homepage-episode-actions">
                                        ${episodeInQueue ? '<span class="homepage-episode-queue-badge" title="In queue">✓</span>' : ''}
                                        ${episode.pub_date ? `<span class="homepage-episode-date">${formatDate(episode.pub_date)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // Category rows: popular categories first, each row scrollable with arrows
    html += getCategoryRowsHtml();
    
    // All Podcasts (fallback if no personalized content)
    if (html === '') {
        // Show empty state with helpful tips
        html = `
            <div class="homepage-empty-state">
                <h2>Welcome to Podcast Library!</h2>
                <p>Get started by:</p>
                <ul>
                    <li>🔍 <strong>Search</strong> for podcasts you love</li>
                    <li>⭐ <strong>Favorite</strong> podcasts to see recommendations</li>
                    <li>▶️ <strong>Play</strong> episodes to build your listening history</li>
                </ul>
            </div>
        `;
        // Also show all podcasts
        renderPodcasts(podcasts, containerEl);
        return;
    }
    
    // Add "Browse All" section at the end
    html += `
        <div class="homepage-section">
            <div class="homepage-section-header">
                <h2 class="homepage-section-title">Browse All Podcasts</h2>
                <a href="#" onclick="navigateTo('grid', 'library'); return false;" class="homepage-section-link">See all</a>
            </div>
        </div>
    `;
    
    containerEl.innerHTML = html;
    
    // Render all podcasts in the grid if present (e.g. when navigating to Library)
    const gridEl = document.getElementById('podcast-grid');
    if (gridEl) {
        renderPodcasts(podcasts, gridEl);
    }
}

function renderPodcasts(podcastsToRender = podcasts, containerEl = null) {
    // Sort the podcasts (duration filter removed)
    const sortedPodcasts = sortPodcasts(podcastsToRender);
    
    // Update count
    updatePodcastCount();
    
    // Render grid view only
    const gridEl = containerEl || document.getElementById('podcast-grid');
    if (!gridEl) {
        console.error('podcast-grid element not found');
        return;
    }
    gridEl.innerHTML = sortedPodcasts.map(podcast => {
        const isFavorite = isPodcastFavorited(podcast.id);
        return `
        <div class="podcast-card">
            <div class="podcast-card-content" onclick="openEpisodes('${podcast.id}')">
                <div class="podcast-image-wrap">
                    <img 
                        src="${podcast.image_url || getPlaceholderImage()}" 
                        alt="${escapeHtml(podcast.title || 'Podcast')}"
                        class="podcast-image"
                        onerror="this.src='${getPlaceholderImage()}'"
                    >
                </div>
                <div class="podcast-info">
                    <div class="podcast-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                    ${(() => {
                        // Don't show author link if we're on the author page
                        if (currentAuthor) return '';
                        const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
                        if (cleanedAuthor && !shouldHideAuthor(cleanedAuthor)) {
                            const authorSlug = generateSlug(cleanedAuthor);
                            return `<div class="podcast-author" onclick="event.stopPropagation(); event.preventDefault(); showAuthor('${escapeHtml(cleanedAuthor)}'); return false;"><a href="/author/${authorSlug}" class="podcast-author-link" onclick="event.stopPropagation(); event.preventDefault(); showAuthor('${escapeHtml(cleanedAuthor)}'); return false;">${escapeHtml(cleanedAuthor)}</a></div>`;
                        }
                        return '';
                    })()}
                </div>
            </div>
            <button class="btn-podcast-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); togglePodcastFavorite('${podcast.id}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorite ? '❤️' : '🤍'}
            </button>
        </div>
    `;
    }).join('');
}

// Filter episodes by duration
function filterEpisodesByDuration(episodesToFilter) {
    if (episodesDurationFilter === 'all') {
        return episodesToFilter;
    }
    
    return episodesToFilter.filter(episode => {
        const durationMinutes = (episode.duration_seconds || 0) / 60;
        
        switch (episodesDurationFilter) {
            case 'under10':
                return durationMinutes > 0 && durationMinutes < 10;
            case '10-30':
                return durationMinutes >= 10 && durationMinutes <= 30;
            case '30-60':
                return durationMinutes > 30 && durationMinutes <= 60;
            case '60plus':
                return durationMinutes > 60;
            default:
                return true;
        }
    });
}

// Sort episodes
function sortEpisodes(episodesToSort) {
    let sorted = [...episodesToSort];
    
    // When sorting by episodes (title-asc, title-desc, random), filter out sequential episodes
    const isStorySort = ['title-asc', 'title-desc', 'random'].includes(episodesSortMode);
    if (isStorySort) {
        sorted = sorted.filter(episode => !isSequentialEpisode(episode));
        
        // Remove duplicates based on normalized title (case-insensitive)
        // Keep the first occurrence of each unique title
        const seenTitles = new Set();
        sorted = sorted.filter(episode => {
            const normalizedTitle = (episode.title || '').toLowerCase().trim();
            if (seenTitles.has(normalizedTitle)) {
                return false; // Duplicate, filter it out
            }
            seenTitles.add(normalizedTitle);
            return true; // First occurrence, keep it
        });
    }
    
    switch (episodesSortMode) {
        case 'title-asc':
            sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
            break;
        case 'title-desc':
            sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleB.localeCompare(titleA);
            });
            break;
        case 'date-desc':
            sorted.sort((a, b) => {
                const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
                const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
                return dateB - dateA;
            });
            break;
        case 'date-asc':
            sorted.sort((a, b) => {
                const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
                const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
                return dateA - dateB;
            });
            break;
        case 'random':
            // Fisher-Yates shuffle algorithm
            for (let i = sorted.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
            }
            break;
    }
    
    return sorted;
}

// Apply episodes sorting
function applyEpisodesSorting() {
    const sortSelect = document.getElementById('episodes-sort-select');
    episodesSortMode = sortSelect.value;
    loadAllEpisodesPage();
}

// Apply episodes duration filter
function applyEpisodesDurationFilter() {
    const filterSelect = document.getElementById('episodes-duration-filter');
    episodesDurationFilter = filterSelect.value;
    loadAllEpisodesPage();
}

// Load all episodes page (lazy-loads episodes if needed)
async function loadAllEpisodesPage() {
    const listEl = document.getElementById('all-episodes-list');
    const controlsEl = document.getElementById('episodes-controls');
    
    if (!listEl) return;
    
    // Show controls
    if (controlsEl) controlsEl.classList.remove('hidden');
    
    listEl.innerHTML = '<div class="empty"><p>Loading episodes...</p></div>';
    
    // OPTIMIZED: Lazy-load episodes only when viewing all-episodes page
    if (!episodesLoaded) {
        await loadAllEpisodes();
    }
    
    setTimeout(() => {
        if (allEpisodes.length === 0) {
            listEl.innerHTML = '<div class="empty"><p>No episodes available</p></div>';
            return;
        }
        
        // Filter by duration first
        let filteredEpisodes = filterEpisodesByDuration(allEpisodes);
        
        // Sort episodes
        const sortedEpisodes = sortEpisodes(filteredEpisodes);
        
        // Update filter selects
        const sortSelect = document.getElementById('episodes-sort-select');
        const durationFilterSelect = document.getElementById('episodes-duration-filter');
        if (sortSelect) sortSelect.value = episodesSortMode;
        if (durationFilterSelect) durationFilterSelect.value = episodesDurationFilter;
        
        const episodesHTML = sortedEpisodes.map(episode => {
            const podcast = podcasts.find(p => p.id === episode.podcast_id);
            if (!podcast) return '';
            
            const progress = getEpisodeProgress(episode.id);
            const isCompleted = progress >= 95;
            const progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>`;
            const isFavorite = isEpisodeFavorited(episode.id);
            const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
            const isEpisodePlaying = isCurrentEpisode && isPlaying;
            
            const episodeInQueue = isInQueue(episode.id);
            return `
                <div class="episode-item ${isCompleted ? 'episode-completed' : ''} ${isCurrentEpisode ? 'episode-playing' : ''}" 
                     oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${podcast.id}');">
                    <div class="episode-item-image">
                        <img src="${podcast.image_url || getPlaceholderImage()}" 
                             alt="${escapeHtml(podcast.title || '')}" 
                             class="episode-list-artwork"
                             onerror="this.src='${getPlaceholderImage()}'">
                    </div>
                    <button class="btn-episode-play ${isEpisodePlaying ? 'playing' : ''}" onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}" title="${isEpisodePlaying ? 'Pause' : 'Play'}">
                        <span class="episode-play-icon" data-episode-id="${episode.id}">${isEpisodePlaying ? '⏸' : '▶'}</span>
                    </button>
                    <div class="episode-item-main" onclick="openEpisodeDetail('${episode.id}', '${podcast.id}')">
                        <div class="episode-title">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                        <div class="episode-meta">
                            <span onclick="event.stopPropagation(); openEpisodes('${podcast.id}')" style="cursor: pointer; text-decoration: underline;">${escapeHtml(podcast.title || 'Unknown Podcast')}</span>
                            ${episode.pub_date ? `<span>• ${formatDate(episode.pub_date)}</span>` : ''}
                            ${episode.duration_seconds ? `<span>• ${formatDuration(episode.duration_seconds)}</span>` : ''}
                            ${progress > 0 ? `<span class="episode-progress-text">${Math.round(progress)}%</span>` : ''}
                        </div>
                        ${progressBar}
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${episodeInQueue ? '<span class="episode-queue-indicator" title="In queue">✓</span>' : ''}
                        <button class="btn-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleEpisodeFavorite('${episode.id}', '${podcast.id}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFavorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');
        
        listEl.innerHTML = `<div class="episodes-list-content">${episodesHTML}</div>`;
    }, 300);
}

// Open episodes page for a podcast
async function openEpisodes(podcastId) {
    currentPodcast = podcasts.find(p => p.id === podcastId);
    
    // Track podcast view
    if (window.analytics && currentPodcast) {
        window.analytics.trackPodcastView(currentPodcast);
    }
    
    // Update URL with podcast slug
    if (currentPodcast) {
        const slug = generateSlug(currentPodcast.title || '');
        const newPath = `/podcast/${slug}`;
        window.history.pushState({ podcastId: podcastId, page: 'episodes' }, '', newPath);
    }
    
    navigateTo('episodes');
    loadEpisodesPage();
}

// Determine default sort order for a podcast based on its characteristics
function getDefaultPodcastSortOrder(podcast, episodes = []) {
    if (!podcast) return 'date-desc'; // Default to newest first
    
    // Check genre for book-related keywords
    const genres = podcast.genre || [];
    const genreStr = Array.isArray(genres) ? genres.join(' ').toLowerCase() : String(genres || '').toLowerCase();
    
    const bookKeywords = ['book', 'audiobook', 'literature', 'novel', 'chapter', 'storytelling', 'fiction', 'narrative'];
    const isBookPodcast = bookKeywords.some(keyword => genreStr.includes(keyword));
    
    if (isBookPodcast) {
        return 'date-asc'; // Books should be oldest first (first chapter first)
    }
    
    // Check title for book/chapter indicators
    const titleStr = (podcast.title || '').toLowerCase();
    const titleBookKeywords = ['chapter', 'part 1', 'episode 1', 'book', 'audiobook'];
    const titleSuggestsBook = titleBookKeywords.some(keyword => titleStr.includes(keyword));
    
    if (titleSuggestsBook) {
        return 'date-asc'; // Books should be oldest first
    }
    
    // Check episode titles for chapter/part patterns (strongest indicator)
    if (episodes && episodes.length > 0) {
        const episodeTitlePatterns = [
            /chapter\s+\d+/i,
            /part\s+\d+/i,
            /episode\s+0*1[^\d]/i, // Episode 1, Episode 01 (but not Episode 10, 11, etc.)
            /^chapter\s+\d+/i,
            /^part\s+\d+/i
        ];
        
        // Check first few episodes for chapter/part patterns
        const sampleEpisodes = episodes.slice(0, Math.min(5, episodes.length));
        const hasChapterPattern = sampleEpisodes.some(ep => {
            const epTitle = (ep.title || '').toLowerCase();
            return episodeTitlePatterns.some(pattern => pattern.test(epTitle));
        });
        
        if (hasChapterPattern) {
            return 'date-asc'; // Books/chapters should be oldest first
        }
    }
    
    // Default: newest first (for daily shows, news, etc.)
    return 'date-desc';
}

// Returns true if podcast is ordered content (book/audiobook) and should always show episodes 1,2,3...
function isBookPodcast(podcast, episodes = []) {
    return getDefaultPodcastSortOrder(podcast, episodes) === 'date-asc';
}

// Filter podcast episodes by duration
function filterPodcastEpisodesByDuration(episodesToFilter) {
    if (podcastEpisodesDurationFilter === 'all') {
        return episodesToFilter;
    }
    
    return episodesToFilter.filter(episode => {
        const durationMinutes = (episode.duration_seconds || 0) / 60;
        
        switch (podcastEpisodesDurationFilter) {
            case 'under10':
                return durationMinutes > 0 && durationMinutes < 10;
            case '10-30':
                return durationMinutes >= 10 && durationMinutes <= 30;
            case '30-60':
                return durationMinutes > 30 && durationMinutes <= 60;
            case '60plus':
                return durationMinutes > 60;
            default:
                return true;
        }
    });
}

// Check if an episode title suggests it's part of a sequence
function isSequentialEpisode(episode) {
    if (!episode || !episode.title) return false;
    
    const title = episode.title.trim();
    const titleLower = title.toLowerCase();
    
    // Patterns that indicate sequential content - we want to filter these out when showing stories
    // Examples to filter: "00 Introduction", "01 - Title", "02 - Title", "Chapter 1", etc.
    // Examples to keep: "And All the Earth a Grave - C C MacApp" (standalone story)
    
    // Check if title starts with numbered sequence (most common case)
    // Matches: "00 ", "01 ", "02 -", "1 -", "2 -", "001.", etc.
    // Pattern breakdown:
    // - ^\d+ matches one or more digits at the start (00, 01, 1, 2, etc.)
    // - \s* matches optional whitespace
    // - [-.\s] matches dash, period, or space (the separator)
    if (/^\d+\s*[-.\s]/.test(title)) {
        // Additional check: if it's a year (4 digits starting with 19 or 20), don't filter it
        // This prevents filtering titles like "1984" or "2001: A Space Odyssey"
        const startsWithYear = /^(19|20)\d{2}/.test(title);
        if (!startsWithYear) {
            return true; // It's a sequential episode
        }
    }
    
    // Check for common sequential words at the start
    if (/^(introduction|prologue|preface|chapter|part|act)\s+/i.test(title)) {
        return true;
    }
    
    // Check for chapter/part/act patterns anywhere in title
    const sequentialPatterns = [
        /\bchapter\s+0*\d+\b/i,  // "chapter 1", "chapter 01", "chapter 2", etc.
        /\bpart\s+0*\d+\b/i,     // "part 1", "part 01", "part 2", etc.
        /\bact\s+0*\d+\b/i,      // "act 1", "act 01", "act 2", etc.
        // Episode patterns (only for low numbers 1-9 to avoid filtering standalone episodes)
        /\bepisode\s+0*[1-9][^\d]/i, // "episode 1", "episode 01" (but not episode 10, 11, etc.)
        /\bep\s+0*[1-9][^\d]/i,    // "ep 1", "ep 01" (but not ep 10, 11, etc.)
    ];
    
    return sequentialPatterns.some(pattern => pattern.test(title));
}

// Sort podcast episodes
function sortPodcastEpisodes(episodesToSort) {
    let sorted = [...episodesToSort];
    
    // When sorting by episodes (title-asc, title-desc, random), filter out sequential episodes
    const isStorySort = ['title-asc', 'title-desc', 'random'].includes(podcastEpisodesSortMode);
    if (isStorySort) {
        sorted = sorted.filter(episode => !isSequentialEpisode(episode));
        
        // Remove duplicates based on normalized title (case-insensitive)
        // Keep the first occurrence of each unique title
        const seenTitles = new Set();
        sorted = sorted.filter(episode => {
            const normalizedTitle = (episode.title || '').toLowerCase().trim();
            if (seenTitles.has(normalizedTitle)) {
                return false; // Duplicate, filter it out
            }
            seenTitles.add(normalizedTitle);
            return true; // First occurrence, keep it
        });
    }
    
    switch (podcastEpisodesSortMode) {
        case 'title-asc':
            sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
            break;
        case 'title-desc':
            sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleB.localeCompare(titleA);
            });
            break;
        case 'date-desc':
            sorted.sort((a, b) => {
                const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
                const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
                return dateB - dateA;
            });
            break;
        case 'date-asc':
            sorted.sort((a, b) => {
                const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
                const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
                return dateA - dateB;
            });
            break;
        case 'random':
            // Fisher-Yates shuffle algorithm
            for (let i = sorted.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
            }
            break;
    }
    
    return sorted;
}

// Restore podcast sort preferences from localStorage
function restorePodcastSortPreferences() {
    try {
        const stored = localStorage.getItem(PODCAST_SORT_PREFERENCES_KEY);
        if (stored) {
            podcastSortPreferences = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error restoring podcast sort preferences:', e);
        podcastSortPreferences = {};
    }
}

// Save podcast sort preferences to localStorage
function savePodcastSortPreferences() {
    try {
        localStorage.setItem(PODCAST_SORT_PREFERENCES_KEY, JSON.stringify(podcastSortPreferences));
        debouncedSync(); // Sync to server if enabled
    } catch (e) {
        console.error('Error saving podcast sort preferences:', e);
    }
}

// Apply podcast episodes sorting
function applyPodcastEpisodesSorting() {
    const sortSelect = document.getElementById('podcast-episodes-sort-select');
    podcastEpisodesSortMode = sortSelect.value;
    // Store user's preference for this podcast
    if (currentPodcast) {
        podcastSortPreferences[currentPodcast.id] = podcastEpisodesSortMode;
        savePodcastSortPreferences();
    }
    loadEpisodesPage();
}

// Apply podcast episodes duration filter
function applyPodcastEpisodesDurationFilter() {
    const filterSelect = document.getElementById('podcast-episodes-duration-filter');
    podcastEpisodesDurationFilter = filterSelect.value;
    loadEpisodesPage();
}

// Load episodes page
async function loadEpisodesPage() {
    if (!currentPodcast) return;
    
    // Update page title for this podcast
    updatePageTitle('episodes');
    
    const loadingEl = document.getElementById('episodes-loading');
    const listEl = document.getElementById('episodes-list');
    const titleEl = document.getElementById('episodes-page-title');
    const controlsEl = document.getElementById('podcast-episodes-controls');
    
    titleEl.textContent = 'Episodes';
    loadingEl.classList.remove('hidden');
    listEl.innerHTML = '';
    
    try {
        let episodes;
        
        // Check cache first
        if (episodesCache[currentPodcast.id]) {
            episodes = episodesCache[currentPodcast.id];
        } else {
            episodes = await apiService.fetchEpisodes(currentPodcast.id);
            episodesCache[currentPodcast.id] = episodes;
            
            // Add episodes to allEpisodes if not already present (for accurate counting)
            episodes.forEach(episode => {
                if (!allEpisodes.find(e => e.id === episode.id)) {
                    allEpisodes.push({
                        ...episode,
                        podcast_title: currentPodcast.title || 'Unknown Podcast',
                        podcast_image: sanitizeImageUrl(currentPodcast.image_url)
                    });
                }
            });
            
            // Re-extract categories to include "Daily" if this podcast now has 200+ episodes
            extractCategories();
            extractAuthors();
            renderSidebar();
            
            // Update podcast display to reflect new episode counts
            if (currentPage !== 'episodes') {
                renderPodcasts(podcasts);
            }
        }
        
        loadingEl.classList.add('hidden');
        
        if (episodes.length === 0) {
            if (controlsEl) controlsEl.classList.add('hidden');
            listEl.innerHTML = '<div class="empty"><p>No episodes available</p></div>';
        } else {
            const podcastId = currentPodcast.id;
            const defaultSort = getDefaultPodcastSortOrder(currentPodcast, episodes);
            const isBook = isBookPodcast(currentPodcast, episodes);
            
            // Book podcasts: always chronological (1,2,3...); ignore saved preference
            if (isBook) {
                podcastEpisodesSortMode = 'date-asc';
                delete podcastSortPreferences[podcastId];
                savePodcastSortPreferences();
            } else if (!podcastSortPreferences[podcastId]) {
                podcastEpisodesSortMode = defaultSort;
                podcastSortPreferences[podcastId] = defaultSort;
                savePodcastSortPreferences();
            } else {
                podcastEpisodesSortMode = podcastSortPreferences[podcastId];
            }
            
            // Show controls
            if (controlsEl) controlsEl.classList.remove('hidden');
            
            // Sort episodes (no duration filtering on podcast episodes page)
            const sortedEpisodes = sortPodcastEpisodes(episodes);
            
            // Update sort select (only visible for non-book podcasts)
            const sortSelect = document.getElementById('podcast-episodes-sort-select');
            if (sortSelect) sortSelect.value = podcastEpisodesSortMode;
            
            // Check if podcast is favorited
            const isPodcastFavorite = isPodcastFavorited(currentPodcast.id);
            
            // Create header with cover art and gradient
            // Ensure we have the latest podcast data with description
            const latestPodcast = podcasts.find(p => p.id === currentPodcast.id) || currentPodcast;
            const hasDescription = latestPodcast.description && latestPodcast.description.trim().length > 0;
            
            // Premium compact header with artwork, title, and controls in one row
            const headerHTML = `
                <div class="episodes-page-header-compact" id="episodes-page-header">
                    <div class="episodes-header-left">
                        <img src="${latestPodcast.image_url || getPlaceholderImage()}" 
                             alt="${escapeHtml(latestPodcast.title || '')}" 
                             class="episodes-page-artwork-compact"
                             onload="extractColorFromImage(this)"
                             onerror="this.src='${getPlaceholderImage()}'">
                        <div class="episodes-header-info">
                            <h1 class="episodes-podcast-title-compact">${escapeHtml(latestPodcast.title || '')}</h1>
                            ${latestPodcast.author ? (() => {
                                const authorSlug = generateSlug(latestPodcast.author);
                                return `<p class="episodes-podcast-author-compact"><a href="/author/${authorSlug}" class="episodes-author-link" onclick="event.preventDefault(); showAuthor('${escapeHtml(latestPodcast.author)}'); return false;">${escapeHtml(latestPodcast.author)}</a></p>`;
                            })() : ''}
                        </div>
                    </div>
                    <div class="episodes-header-right">
                        ${episodes.length > 1 ? `
                        <div class="episodes-header-controls">
                            ${isBook ? '<span class="episodes-order-msg">Default: oldest first (1, 2, 3…).</span>' : ''}
                            <div class="sort-controls-inline">
                                <label for="podcast-episodes-sort-select-inline" class="sort-label-inline">Sort:</label>
                                <select id="podcast-episodes-sort-select-inline" class="sort-select-inline" onchange="applyPodcastEpisodesSorting()">
                                    <option value="title-asc" ${podcastEpisodesSortMode === 'title-asc' ? 'selected' : ''}>A-Z</option>
                                    <option value="title-desc" ${podcastEpisodesSortMode === 'title-desc' ? 'selected' : ''}>Z-A</option>
                                    <option value="date-desc" ${podcastEpisodesSortMode === 'date-desc' ? 'selected' : ''}>Newest</option>
                                    <option value="date-asc" ${podcastEpisodesSortMode === 'date-asc' ? 'selected' : ''}>Oldest</option>
                                    <option value="random" ${podcastEpisodesSortMode === 'random' ? 'selected' : ''}>Random</option>
                                </select>
                            </div>
                        </div>
                        ` : ''}
                        <button class="btn-podcast-favorite-episodes-compact ${isPodcastFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); togglePodcastFavorite('${latestPodcast.id}');" title="${isPodcastFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isPodcastFavorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            `;
            
            // Compact collapsible description integrated into header
            let descriptionHTML = '';
            if (hasDescription) {
                const fullDescription = sanitizeHtml(latestPodcast.description);
                const originalDescription = latestPodcast.description;
                
                // Extract first 1-2 sentences (approximately 150-200 chars or until second sentence)
                const sentences = originalDescription.match(/[^.!?]+[.!?]+/g) || [originalDescription];
                const previewText = sentences.length > 1 
                    ? sentences.slice(0, 2).join(' ').trim()
                    : (originalDescription.length > 200 
                        ? originalDescription.substring(0, 200).trim() + '...'
                        : originalDescription);
                const previewHtml = sanitizeHtml(previewText);
                
                // Only show toggle if preview text is actually shorter than full description
                // Compare original text lengths (not HTML-sanitized) to accurately detect truncation
                const originalPreviewLength = previewText.length;
                const originalFullLength = originalDescription.length;
                const hasMore = originalFullLength > originalPreviewLength;
                
                descriptionHTML = `
                    <div class="episodes-page-description-compact" data-full-description="${escapeHtml(fullDescription)}">
                        <div class="description-preview">${previewHtml}</div>
                        ${hasMore ? `
                            <!-- Full description kept in HTML for SEO but visually hidden -->
                            <div class="description-full hidden">${fullDescription}</div>
                            <button class="btn-description-toggle" onclick="window.toggleDescription(this)">
                                <span class="toggle-text">See more</span>
                                <span class="toggle-icon">▼</span>
                            </button>
                        ` : ''}
                    </div>
                `;
            }
            
            const episodesHTML = sortedEpisodes.map(episode => {
                const progress = getEpisodeProgress(episode.id);
                const isCompleted = progress >= 95; // Consider 95%+ as completed
                const progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>`;
                const isFavorite = isEpisodeFavorited(episode.id);
                const isCurrentEpisode = currentEpisode && currentEpisode.id === episode.id;
                const isEpisodePlaying = isCurrentEpisode && isPlaying;
                
                const episodeInQueue = isInQueue(episode.id);
                return `
                    <div class="episode-item episode-item-no-art ${isCompleted ? 'episode-completed' : ''} ${isCurrentEpisode ? 'episode-playing' : ''}" 
                         oncontextmenu="event.preventDefault(); showEpisodeContextMenu(event, '${episode.id}', '${currentPodcast.id}');">
                        <button class="btn-episode-play ${isEpisodePlaying ? 'playing' : ''}" onclick="event.stopPropagation(); ${isEpisodePlaying ? 'togglePlayPause()' : `playEpisode(${JSON.stringify(episode).replace(/"/g, '&quot;')})`}" title="${isEpisodePlaying ? 'Pause' : 'Play'}">
                            <span class="episode-play-icon" data-episode-id="${episode.id}">${isEpisodePlaying ? '⏸' : '▶'}</span>
                        </button>
                        <div class="episode-item-main" onclick="openEpisodeDetail('${episode.id}', '${currentPodcast.id}')">
                            <div class="episode-title">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                            <div class="episode-meta">
                                ${episode.pub_date ? `<span>${formatDate(episode.pub_date)}</span>` : ''}
                                ${episode.duration_seconds ? `<span>${formatDuration(episode.duration_seconds)}</span>` : ''}
                                ${progress > 0 ? `<span class="episode-progress-text">${Math.round(progress)}%</span>` : ''}
                            </div>
                            ${progressBar}
                        </div>
                        <div class="episode-item-actions">
                            ${episodeInQueue ? '<span class="episode-queue-indicator" title="In queue">✓</span>' : ''}
                            <button class="btn-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleEpisodeFavorite('${episode.id}', '${currentPodcast.id}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                                ${isFavorite ? '❤️' : '🤍'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Hide the separate controls since we moved them to header
            if (controlsEl) controlsEl.classList.add('hidden');
            
            // Get suggested podcasts based on genre
            const suggestedPodcasts = getRelatedPodcastsByGenre(currentPodcast.id, latestPodcast.genre, 6);
            let suggestedHTML = '';
            if (suggestedPodcasts && suggestedPodcasts.length > 0) {
                suggestedHTML = `
                    <div class="suggested-podcasts-section">
                        <h2 class="suggested-podcasts-title">You might also like</h2>
                        <div class="suggested-podcasts-grid">
                            ${suggestedPodcasts.map(podcast => {
                                const isFavorite = isPodcastFavorited(podcast.id);
                                const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
                                return `
                                    <div class="suggested-podcast-card">
                                        <div class="suggested-podcast-content" onclick="openEpisodes('${podcast.id}')">
                                            <img 
                                                src="${sanitizeImageUrl(podcast.image_url) || getPlaceholderImage()}" 
                                                alt="${escapeHtml(podcast.title || 'Podcast')}"
                                                class="suggested-podcast-image"
                                                onerror="this.src='${getPlaceholderImage()}'"
                                            >
                                            <div class="suggested-podcast-info">
                                                <div class="suggested-podcast-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                                                ${cleanedAuthor && !shouldHideAuthor(cleanedAuthor) ? `<div class="suggested-podcast-author">${escapeHtml(cleanedAuthor)}</div>` : ''}
                                            </div>
                                        </div>
                                        <button class="btn-podcast-favorite-suggested ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); togglePodcastFavorite('${podcast.id}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                                            ${isFavorite ? '❤️' : '🤍'}
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Structure: Header, Description Section, Episodes Section, Suggested Section
            // Each in separate divs with seamless dark background
            listEl.innerHTML = headerHTML + 
                (descriptionHTML ? `<div class="podcast-description-section">${descriptionHTML}</div>` : '') +
                `<div class="podcast-episodes-section">
                    <div class="episodes-list-content-compact">${episodesHTML}</div>
                </div>` +
                (suggestedHTML ? `<div class="podcast-suggested-section">${suggestedHTML}</div>` : '');
            
            // Sync the inline sort select with the hidden one
            const inlineSelect = document.getElementById('podcast-episodes-sort-select-inline');
            const hiddenSelect = document.getElementById('podcast-episodes-sort-select');
            if (inlineSelect && hiddenSelect) {
                inlineSelect.addEventListener('change', function() {
                    hiddenSelect.value = this.value;
                    applyPodcastEpisodesSorting();
                });
            }
        }
    } catch (error) {
        console.error('Error loading episodes:', error);
        loadingEl.classList.add('hidden');
        if (controlsEl) controlsEl.classList.add('hidden');
        listEl.innerHTML = `<div class="error"><p>Error loading episodes: ${escapeHtml(error.message)}</p></div>`;
    }
}

// Load player page
function loadPlayerPage() {
    const contentEl = document.getElementById('player-page-content');
    
    if (!currentEpisode) {
        contentEl.innerHTML = `
            <div class="player-page-empty">
                <p>No episode selected</p>
                <p class="subtitle">Start playing an episode to see it here</p>
            </div>
        `;
        return;
    }
    
    const podcastTitle = currentPodcast ? currentPodcast.title : 'Unknown Podcast';
    const progress = getEpisodeProgress(currentEpisode.id);
    const currentTime = audioPlayer?.currentTime || 0;
    const duration = audioPlayer?.duration || 0;
    
    const artworkUrl = sanitizeImageUrl(currentPodcast?.image_url) || getPlaceholderImage();
    contentEl.innerHTML = `
        <div class="player-page-episode" style="background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%), url('${artworkUrl}') center/cover no-repeat;">
            <div class="player-page-backdrop"></div>
            <div class="player-page-content-wrapper">
                <div class="player-page-artwork-container">
                    ${artworkUrl !== getPlaceholderImage() ? `<img src="${artworkUrl}" alt="${escapeHtml(podcastTitle)}" class="player-page-artwork" onerror="this.src='${getPlaceholderImage()}'">` : ''}
                </div>
                <div class="player-page-info">
                    <h2>${escapeHtml(currentEpisode.title || 'Untitled Episode')}</h2>
                    <p class="player-page-podcast" onclick="openEpisodes('${currentPodcast?.id || ''}')" style="cursor: pointer; text-decoration: underline;">${escapeHtml(podcastTitle)}</p>
                    ${currentEpisode.description ? `<div class="player-page-description">${sanitizeHtml(currentEpisode.description)}</div>` : ''}
                    <div class="player-page-controls-large">
                        <button class="btn-skip-circular-large" onclick="skipBackward()" title="Skip back 10s">
                            <svg class="skip-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M11 18 L5 12 L11 6" />
                                <path d="M19 18 L13 12 L19 6" />
                            </svg>
                            <span class="skip-number">-10</span>
                        </button>
                        <button id="play-pause-btn-player-page" class="btn-play-pause-large" onclick="togglePlayPause()">
                            <span id="play-icon-player-page">${isPlaying ? '⏸' : '▶'}</span>
                        </button>
                        <button class="btn-skip-circular-large" onclick="skipForward()" title="Skip forward 30s">
                            <svg class="skip-arrow forward" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M13 18 L19 12 L13 6" />
                                <path d="M5 18 L11 12 L5 6" />
                            </svg>
                            <span class="skip-number">+30</span>
                        </button>
                    </div>
                    <div class="player-page-progress">
                        <div class="progress-bar-large" onclick="seekToPositionOnPlayerPage(event)">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="player-page-time">
                            <span id="player-page-current-time">${formatTime(currentTime)}</span>
                            <span id="player-page-duration">${formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Seek to position on player page
function seekToPositionOnPlayerPage(event) {
    if (!audioPlayer || !currentEpisode) return;
    
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * audioPlayer.duration;
    
    if (!isNaN(newTime) && isFinite(newTime)) {
        audioPlayer.currentTime = Math.max(0, Math.min(newTime, audioPlayer.duration));
    }
}

// Set search mode
function setSearchMode(mode) {
    searchMode = mode;
    const episodesBtn = document.getElementById('search-mode-episodes');
    const podcastsBtn = document.getElementById('search-mode-podcasts');
    const soundsBtn = document.getElementById('search-mode-sounds');
    
    if (episodesBtn) episodesBtn.classList.toggle('active', mode === 'episodes');
    if (podcastsBtn) podcastsBtn.classList.toggle('active', mode === 'podcasts');
    if (soundsBtn) soundsBtn.classList.toggle('active', mode === 'sounds');
    
    // Update dropdown if it exists
    const dropdown = document.getElementById('search-mode-dropdown');
    if (dropdown) {
        dropdown.value = mode;
    }
    
    const topSearchInput = document.getElementById('top-search-input');
    if (topSearchInput) {
        if (mode === 'episodes') {
            topSearchInput.placeholder = 'Search episodes...';
        } else if (mode === 'podcasts') {
            topSearchInput.placeholder = 'Search podcasts...';
        } else if (mode === 'sounds') {
            topSearchInput.placeholder = 'Search sounds...';
        }
    }
    
    // If switching to sounds mode, navigate to sounds page
    if (mode === 'sounds') {
        navigateTo('sounds');
        loadSoundsPage();
        return; // Don't continue with search logic
    }
    
    // If no search query, navigate to show all items
    if (!topSearchInput.value || topSearchInput.value.trim() === '') {
        if (mode === 'podcasts') {
            // Navigate to grid page to show all podcasts
            navigateTo('grid');
        } else {
            // Navigate to all episodes page
            navigateTo('all-episodes');
        }
    } else {
        // Re-run search if there's a value
        handleSearch(topSearchInput.value);
    }
}

// Handle search input
function handleSearchInput(value) {
    if (value && value.trim() !== '') {
        // Navigate to search page if not already there
        if (currentPage !== 'search') {
            navigateTo('search');
        }
        handleSearch(value);
    } else {
        // If search is cleared, show all items based on mode
        if (currentPage === 'search') {
            if (searchMode === 'podcasts') {
                navigateTo('grid');
            } else {
                navigateTo('all-episodes');
            }
        }
    }
}

// Handle search focus
function handleSearchFocus() {
    // Open search modal when clicking on top search bar
    openSearchModal();
}

// Open search modal (Spotlight-like)
function openSearchModal() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-modal-input');
    if (modal) {
        modal.classList.remove('hidden');
        // Sync search mode with main search
        setSearchModeModal(searchMode);
        // Focus input after a brief delay to ensure modal is visible
        setTimeout(() => {
            if (input) {
                input.focus();
                // Copy value from top search if it exists
                const topInput = document.getElementById('top-search-input');
                if (topInput && topInput.value) {
                    input.value = topInput.value;
                    handleSearchModalInput(topInput.value);
                }
            }
        }, 50);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

// Close search modal
function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Restore body scroll
        document.body.style.overflow = '';
        // Clear input
        const input = document.getElementById('search-modal-input');
        if (input) {
            input.value = '';
        }
        const results = document.getElementById('search-modal-results');
        if (results) {
            results.innerHTML = '<div class="search-modal-empty"><p>Start typing to search...</p></div>';
        }
    }
}


// Set search mode in modal
function setSearchModeModal(mode) {
    searchMode = mode;
    const episodesBtn = document.getElementById('search-mode-episodes-modal');
    const podcastsBtn = document.getElementById('search-mode-podcasts-modal');
    
    if (episodesBtn) episodesBtn.classList.toggle('active', mode === 'episodes');
    if (podcastsBtn) podcastsBtn.classList.toggle('active', mode === 'podcasts');
    
    // Also update main search mode buttons
    setSearchMode(mode);
    
    // Update placeholder
    const input = document.getElementById('search-modal-input');
    if (input) {
        if (mode === 'episodes') {
            input.placeholder = 'Search episodes...';
        } else if (mode === 'podcasts') {
            input.placeholder = 'Search podcasts...';
        }
    }
    
    // Re-run search if there's a value
    if (input && input.value) {
        handleSearchModalInput(input.value);
    }
}

// Handle search input in modal
function handleSearchModalInput(value) {
    const resultsEl = document.getElementById('search-modal-results');
    if (!resultsEl) return;
    
    if (!value || value.trim() === '') {
        resultsEl.innerHTML = '<div class="search-modal-empty"><p>Start typing to search...</p></div>';
        return;
    }
    
    // Use the existing handleSearch function but display in modal
    handleSearchModal(value);
}

// Search functionality for modal
async function handleSearchModal(query) {
    const resultsEl = document.getElementById('search-modal-results');
    if (!resultsEl) return;
    
    const searchTerm = query.toLowerCase();
    
    if (searchMode === 'episodes') {
        // OPTIMIZED: Lazy-load episodes only when searching
        if (!episodesLoaded) {
            resultsEl.innerHTML = '<div class="search-modal-empty"><p>Loading episodes...</p></div>';
            await loadAllEpisodes();
        }
        
        // Search episodes
        const matches = allEpisodes.filter(ep => 
            (ep.title || '').toLowerCase().includes(searchTerm) ||
            (ep.description || '').toLowerCase().includes(searchTerm)
        );
        
        if (matches.length === 0) {
            resultsEl.innerHTML = '<div class="search-modal-empty"><p>No episodes found</p></div>';
            return;
        }
        
        // Display results in modal format
        resultsEl.innerHTML = matches.slice(0, 10).map(episode => {
            const podcast = podcasts.find(p => p.id === episode.podcast_id);
            const podcastTitle = podcast ? podcast.title : 'Unknown Podcast';
            return `
                <div class="search-result-item" onclick="closeSearchModal(); openEpisodeDetail('${episode.id}', '${episode.podcast_id || ''}')">
                    <div class="search-result-main">
                        <div class="search-result-image">
                            <img src="${podcast && podcast.image_url ? sanitizeImageUrl(podcast.image_url) : getPlaceholderImage()}" 
                                 alt="${escapeHtml(podcastTitle)}"
                                 onerror="this.src='${getPlaceholderImage()}'">
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                            <div class="search-result-meta">
                                <span>${escapeHtml(podcastTitle)}</span>
                                ${episode.pub_date ? `<span>• ${formatDate(episode.pub_date)}</span>` : ''}
                                ${episode.duration_seconds ? `<span>• ${formatDuration(episode.duration_seconds)}</span>` : ''}
                            </div>
                            ${episode.description ? `<div class="search-result-description">${escapeHtml(episode.description.replace(/<[^>]*>/g, '').substring(0, 150))}...</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else if (searchMode === 'podcasts') {
        const matches = podcasts.filter(podcast => 
            (podcast.title || '').toLowerCase().includes(searchTerm) ||
            (podcast.author || '').toLowerCase().includes(searchTerm) ||
            (podcast.description || '').toLowerCase().includes(searchTerm)
        );
        
        if (matches.length === 0) {
            resultsEl.innerHTML = '<div class="search-modal-empty"><p>No podcasts found</p></div>';
            return;
        }
        
        // Display results in modal format
        resultsEl.innerHTML = matches.slice(0, 10).map(podcast => {
            const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
            return `
                <div class="search-result-item podcast-result" onclick="closeSearchModal(); openEpisodes('${podcast.id}')">
                    <div class="search-result-main">
                        <div class="search-result-image">
                            <img src="${sanitizeImageUrl(podcast.image_url) || getPlaceholderImage()}" 
                                 alt="${escapeHtml(podcast.title || 'Podcast')}"
                                 onerror="this.src='${getPlaceholderImage()}'">
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                            <div class="search-result-meta">
                                ${cleanedAuthor && !shouldHideAuthor(cleanedAuthor) ? `<span>${escapeHtml(cleanedAuthor)}</span>` : ''}
                            </div>
                            ${podcast.description ? `<div class="search-result-description">${escapeHtml(podcast.description.replace(/<[^>]*>/g, '').substring(0, 150))}...</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Search functionality
async function handleSearch(query) {
    const resultsEl = document.getElementById('search-results');
    const titleEl = document.getElementById('search-page-title');
    if (!resultsEl) return;
    
    if (!query || query.trim() === '') {
        resultsEl.innerHTML = '<div class="empty"><p>Start typing to search...</p></div>';
        if (titleEl) titleEl.textContent = 'Search';
        return;
    }
    
    if (titleEl) titleEl.textContent = 'Search Results';
    const searchTerm = query.toLowerCase();
    
    if (searchMode === 'episodes') {
        // OPTIMIZED: Lazy-load episodes only when searching
        if (!episodesLoaded) {
            resultsEl.innerHTML = '<div class="empty"><p>Loading episodes...</p></div>';
            await loadAllEpisodes();
        }
        
        // Search episodes
        const matches = allEpisodes.filter(ep => 
            (ep.title || '').toLowerCase().includes(searchTerm) ||
            (ep.description || '').toLowerCase().includes(searchTerm)
        );
        
        // Track search
        if (window.analytics) {
            window.analytics.trackSearch(query, searchMode, matches.length);
        }
        
        if (matches.length === 0) {
            resultsEl.innerHTML = '<div class="empty"><p>No episodes found</p></div>';
            return;
        }
        
        resultsEl.innerHTML = matches.map(episode => {
            const podcast = podcasts.find(p => p.id === episode.podcast_id);
            const isFavorite = podcast ? isEpisodeFavorited(episode.id) : false;
            return `
                <div class="search-result-item">
                    <div class="search-result-main" onclick="openEpisodeDetail('${episode.id}', '${podcast?.id || ''}')">
                        <div class="search-result-image">
                            ${podcast?.image_url ? `<img src="${podcast.image_url}" alt="${escapeHtml(podcast.title || '')}" onerror="this.src='${getPlaceholderImage()}'">` : '<div class="placeholder-image"></div>'}
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(episode.title || 'Untitled Episode')}</div>
                            <div class="search-result-meta">
                                <span onclick="event.stopPropagation(); openEpisodes('${podcast?.id || ''}')" style="cursor: pointer; text-decoration: underline;">${escapeHtml(podcast?.title || 'Unknown Podcast')}</span>
                                ${episode.pub_date ? `<span>• ${formatDate(episode.pub_date)}</span>` : ''}
                                ${episode.duration_seconds ? `<span>• ${formatDuration(episode.duration_seconds)}</span>` : ''}
                            </div>
                            ${episode.description ? `<div class="search-result-description">${sanitizeHtml(episode.description.substring(0, 150))}...</div>` : ''}
                        </div>
                    </div>
                    ${podcast ? `<button class="btn-favorite ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleEpisodeFavorite('${episode.id}', '${podcast.id}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>` : ''}
                </div>
            `;
        }).join('');
    } else {
        // Search podcasts
        const matches = podcasts.filter(p => {
            const title = (p.title || '').toLowerCase();
            const author = (p.author || '').toLowerCase();
            return title.includes(searchTerm) || author.includes(searchTerm);
        });
        
        if (matches.length === 0) {
            resultsEl.innerHTML = '<div class="empty"><p>No podcasts found</p></div>';
            return;
        }
        
        resultsEl.innerHTML = matches.map(podcast => {
            const isFavorite = isPodcastFavorited(podcast.id);
            return `
                <div class="search-result-item podcast-result">
                    <div class="search-result-main" onclick="openEpisodes('${podcast.id}')">
                        <div class="search-result-image">
                            ${podcast.image_url ? `<img src="${podcast.image_url}" alt="${escapeHtml(podcast.title || '')}" onerror="this.src='${getPlaceholderImage()}'">` : '<div class="placeholder-image"></div>'}
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-title">${escapeHtml(podcast.title || 'Untitled Podcast')}</div>
                            ${(() => {
                                const cleanedAuthor = podcast.author ? cleanAuthorText(podcast.author) : '';
                                if (cleanedAuthor && !shouldHideAuthor(cleanedAuthor)) {
                                    const authorSlug = generateSlug(cleanedAuthor);
                                    return `<div class="search-result-meta">
                                        <span onclick="event.stopPropagation(); event.preventDefault(); showAuthor('${escapeHtml(cleanedAuthor)}'); return false;" style="cursor: pointer; color: var(--accent); text-decoration: underline;">
                                            ${escapeHtml(cleanedAuthor)}
                                        </span>
                                    </div>`;
                                }
                                return '';
                            })()}
                            ${podcast.description ? `<div class="search-result-description">${sanitizeHtml(podcast.description.substring(0, 200))}...</div>` : ''}
                        </div>
                    </div>
                    <button class="btn-podcast-favorite-search ${isFavorite ? 'favorited' : ''}" onclick="event.stopPropagation(); togglePodcastFavorite('${podcast.id}');" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>
                </div>
            `;
        }).join('');
    }
}

// Play episode from search
function playEpisodeFromSearch(episode) {
    const podcast = podcasts.find(p => p.id === episode.podcast_id);
    currentPodcast = podcast;
    playEpisode(episode);
    navigateTo('episode');
}

// Play episode
function playEpisode(episode) {
    if (!episode.audio_url) {
        alert('This episode has no audio URL available.');
        return;
    }
    
    // Stop any currently playing sound
    if (soundAudioPlayer && currentSound) {
        soundAudioPlayer.pause();
        soundAudioPlayer.currentTime = 0;
        currentSound = null;
        const soundPlayerBar = document.getElementById('sound-player-bar');
        if (soundPlayerBar) {
            soundPlayerBar.classList.add('hidden');
            document.body.classList.remove('sound-player-visible');
        }
    }
    
    // Check if this is a new episode (before we update currentEpisode)
    const isNewEpisode = !currentEpisode || currentEpisode.id !== episode.id;
    
    // Save previous progress if switching episodes
    if (currentEpisode && currentEpisode.id !== episode.id) {
        saveProgress();
        // Reset progress tracking for new episode
        if (window.analytics) {
            window.analytics.resetEpisodeProgress(episode.id);
        }
    }
    
    currentEpisode = episode;
    
    // Find podcast if not set
    if (!currentPodcast || currentPodcast.id !== episode.podcast_id) {
        currentPodcast = podcasts.find(p => p.id === episode.podcast_id);
    }
    
    // Track episode play
    if (window.analytics && currentPodcast) {
        window.analytics.trackEpisodePlay(episode, currentPodcast);
    }
    
    // Add to history only when starting a NEW episode (not when resuming the same one)
    if (currentPodcast && isNewEpisode) {
        addEpisodeToHistory(episode.id, currentPodcast.id);
    }
    
    // Update player UI immediately for better UX
    updatePlayerBar();
    updateSleepTimerUI(); // Update sidebar timer visibility
    
    // Show player bar
    const playerBar = document.getElementById('player-bar');
    playerBar.classList.remove('hidden');
    document.body.classList.add('player-bar-visible');
    
    // Set source - only change if different episode
    const currentSrc = audioPlayer.src.split('?')[0]; // Remove query params for comparison
    const newSrc = episode.audio_url.split('?')[0];
    
    if (currentSrc !== newSrc) {
        // New episode - set source and wait for it to be ready
        audioPlayer.src = episode.audio_url;
        // Don't call load() - setting src triggers automatic loading
        // Remove preload attribute to allow faster initial loading
        audioPlayer.removeAttribute('preload');
        
        // Restore progress for this episode
        const savedProgress = getEpisodeProgress(episode.id);
        if (savedProgress > 0 && savedProgress < 95) {
            const savedTime = (savedProgress / 100) * (episode.duration_seconds || 0);
            audioPlayer.addEventListener('loadedmetadata', () => {
                if (audioPlayer.duration && savedTime < audioPlayer.duration) {
                    audioPlayer.currentTime = savedTime;
                }
            }, { once: true });
        }
        
        // Wait for audio to be ready before playing - this is key for faster playback
        let playHandlerAttached = false;
        const playWhenReady = () => {
            if (playHandlerAttached) return;
            playHandlerAttached = true;
            
            // Try to play - if it fails due to autoplay restrictions, user can click play
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        isPlaying = true;
                        updatePlayPauseButton();
                        updateSleepTimerUI(); // Update sidebar timer visibility
                    })
                    .catch(error => {
                        // Autoplay was prevented - this is fine, user will click play
                        console.log('Autoplay prevented:', error);
                        isPlaying = false;
                        updatePlayPauseButton();
                        updateSleepTimerUI(); // Update sidebar timer visibility
                    });
            } else {
                isPlaying = true;
                updatePlayPauseButton();
            }
        };
        
        // Use canplay event for faster start (doesn't wait for full buffer)
        // This fires as soon as enough data is loaded to start playing
        audioPlayer.addEventListener('canplay', playWhenReady, { once: true });
        
        // Also listen for canplaythrough as a backup
        audioPlayer.addEventListener('canplaythrough', playWhenReady, { once: true });
        
        // If audio is already ready (e.g., cached), play immediately
        if (audioPlayer.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            playWhenReady();
        }
    } else {
        // Same episode - just resume playback
        audioPlayer.play().then(() => {
            isPlaying = true;
            updatePlayPauseButton();
        }).catch(() => {
            isPlaying = false;
            updatePlayPauseButton();
        });
    }
    
    // Update pages if we're on them
    if (currentPage === 'player') {
        loadPlayerPage();
    } else if (currentPage === 'episode') {
        // If we're on the episode detail page, check if we should update displayedEpisode
        // Only update if the displayed episode is the one we just started playing
        if (!displayedEpisode || displayedEpisode.id === currentEpisode.id) {
            displayedEpisode = currentEpisode; // Update to show the playing episode
        }
        loadEpisodeDetailPage();
    }
    
    // Update episode detail page if visible
    if (document.getElementById('episode-detail-content')) {
        updatePlayPauseButton();
    }
    
    // Update episode list if visible (use in-place update to preserve scroll and button handlers)
    // Note: updatePlayPauseButton() will handle the in-place updates, so we don't need to reload
    // Only reload if we're on a different page that shows episodes
    if (currentPage === 'history') {
        loadRecentlyListenedPage();
    } else if (currentPage === 'all-episodes') {
        loadAllEpisodesPage();
    }
    // For episodes page, updatePlayPauseButton() already handles in-place updates
}

// Skip backward 10 seconds
function skipBackward() {
    if (!audioPlayer || !currentEpisode) return;
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
}

// Skip forward 30 seconds
function skipForward() {
    if (!audioPlayer || !currentEpisode) return;
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 30);
}

// Toggle description expand/collapse (make globally available for onclick)
window.toggleDescription = function(button) {
    if (!button || !(button instanceof Element) || typeof button.closest !== 'function') return;
    const container = button.closest('.episodes-page-description-compact');
    if (!container) return;
    
    const preview = container.querySelector('.description-preview');
    const full = container.querySelector('.description-full');
    const toggleText = button.querySelector('.toggle-text');
    const toggleIcon = button.querySelector('.toggle-icon');
    
    if (!full || !preview) return;
    
    const isExpanded = !full.classList.contains('hidden');
    
    if (isExpanded) {
        // Collapse - show preview, hide full
        full.classList.add('hidden');
        preview.style.display = 'block';
        preview.style.visibility = 'visible';
        toggleText.textContent = 'See more';
        toggleIcon.textContent = '▼';
    } else {
        // Expand - show full, hide preview
        full.classList.remove('hidden');
        full.style.display = 'block';
        full.style.visibility = 'visible';
        preview.style.display = 'none';
        preview.style.visibility = 'hidden';
        toggleText.textContent = 'See less';
        toggleIcon.textContent = '▲';
    }
    
    // Ensure episodes list is always visible
    const episodesList = container.closest('#episodes-list');
    if (episodesList) {
        const episodesContent = episodesList.querySelector('.episodes-list-content-compact');
        if (episodesContent) {
            episodesContent.style.display = 'block';
            episodesContent.style.visibility = 'visible';
        }
    }
};

// Toggle author description expand/collapse (make globally available for onclick)
window.toggleAuthorDescription = function(button) {
    if (!button || !(button instanceof Element) || typeof button.closest !== 'function') return;
    const container = button.closest('.author-description-content');
    if (!container) return;
    
    const preview = container.querySelector('.description-preview');
    const full = container.querySelector('.description-full');
    const toggleText = button.querySelector('.toggle-text');
    const toggleIcon = button.querySelector('.toggle-icon');
    
    if (!full || !preview) return;
    
    const isExpanded = !full.classList.contains('hidden');
    
    if (isExpanded) {
        // Collapse
        full.classList.add('hidden');
        preview.style.display = 'block';
        toggleText.textContent = 'See more';
        toggleIcon.textContent = '▼';
    } else {
        // Expand
        full.classList.remove('hidden');
        preview.style.display = 'none';
        toggleText.textContent = 'See less';
        toggleIcon.textContent = '▲';
    }
};

// Toggle play/pause
function togglePlayPause() {
    if (!currentEpisode) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        // Track pause
        if (window.analytics && currentPodcast) {
            window.analytics.trackEpisodePause(
                currentEpisode, 
                currentPodcast, 
                audioPlayer.currentTime, 
                audioPlayer.duration
            );
        }
    } else {
        audioPlayer.play();
        isPlaying = true;
    }
    updatePlayPauseButton();
    updateSleepTimerUI(); // Update sidebar timer visibility
}

// Helper function to play episode by ID (used by onclick handlers)
window.playEpisodeById = function(episodeId) {
    const episode = findEpisodeById(episodeId);
    if (episode) {
        playEpisode(episode);
    } else {
        console.error(`Episode not found: ${episodeId}`);
    }
};

// Helper function to find episode by ID
function findEpisodeById(episodeId) {
    // Try to find from allEpisodes first
    let episode = allEpisodes.find(e => String(e.id) === String(episodeId));
    
    // If not found and we're on episodes page, try to get from cache
    if (!episode && currentPodcast && episodesCache[currentPodcast.id]) {
        episode = episodesCache[currentPodcast.id].find(e => String(e.id) === String(episodeId));
    }
    
    return episode;
}

// Update episode list in-place without reloading (preserves scroll position)
function updateEpisodeListInPlace() {
    // Save scroll position - check multiple possible containers
    let container = null;
    let scrollPosition = 0;
    
    // Try to find the scrollable container
    if (currentPage === 'episodes') {
        container = document.getElementById('episodes-list');
    } else if (currentPage === 'all-episodes') {
        container = document.getElementById('all-episodes-list');
    } else if (currentPage === 'history') {
        container = document.getElementById('history-list');
    } else if (currentPage === 'favorites') {
        container = document.getElementById('favorites-content');
    }
    
    // If still no container found, try the class selector as fallback
    if (!container) {
        container = document.querySelector('.episodes-full-page');
    }
    
    // If no specific container, use window
    if (container) {
        scrollPosition = container.scrollTop || 0;
    } else {
        scrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
    }
    
    // Update all episode items
    const episodeItems = document.querySelectorAll('.episode-item');
    episodeItems.forEach(item => {
        const playButton = item.querySelector('.btn-episode-play');
        const playIcon = item.querySelector('.episode-play-icon');
        
        if (!playIcon || !playButton) return;
        
        const episodeId = playIcon.getAttribute('data-episode-id');
        if (!episodeId) return;
        
        // Check if this is the currently playing episode
        const isCurrentEpisode = currentEpisode && String(episodeId) === String(currentEpisode.id);
        const isEpisodePlaying = isCurrentEpisode && isPlaying;
        
        // Update play icon
        playIcon.textContent = isEpisodePlaying ? '⏸' : '▶';
        
        // Update button class
        if (isEpisodePlaying) {
            playButton.classList.add('playing');
        } else {
            playButton.classList.remove('playing');
        }
        
        // Store episode ID in data attribute for easy lookup
        playButton.setAttribute('data-episode-id', episodeId);
        
        // Remove old onclick attribute and set new one using the helper function
        playButton.removeAttribute('onclick');
        if (isEpisodePlaying) {
            playButton.onclick = function(e) {
                e.stopPropagation();
                togglePlayPause();
            };
        } else {
            playButton.onclick = function(e) {
                e.stopPropagation();
                const episode = findEpisodeById(episodeId);
                if (episode) {
                    playEpisode(episode);
                }
            };
        }
        
        playButton.setAttribute('title', isEpisodePlaying ? 'Pause' : 'Play');
        
        // Update episode item highlighting
        if (isCurrentEpisode) {
            item.classList.add('episode-playing');
        } else {
            item.classList.remove('episode-playing');
        }
    });
    
    // Restore scroll position after a brief delay to ensure DOM updates are complete
    setTimeout(() => {
        if (container) {
            container.scrollTop = scrollPosition;
        } else {
            window.scrollTo(0, scrollPosition);
        }
    }, 0);
}

// Helper function to find episode data for an item
function findEpisodeDataForItem(item, episodeId) {
    // Try to find from allEpisodes first
    let episode = allEpisodes.find(e => String(e.id) === String(episodeId));
    
    // If not found and we're on episodes page, try to get from cache
    if (!episode && currentPodcast && episodesCache[currentPodcast.id]) {
        episode = episodesCache[currentPodcast.id].find(e => String(e.id) === String(episodeId));
    }
    
    return episode;
}

// Find episode by id and optional podcastId (for homepage/Library play buttons)
function findEpisodeByIdAndPodcast(episodeId, podcastId) {
    let episode = allEpisodes.find(e => String(e.id) === String(episodeId));
    if (!episode && podcastId && episodesCache[podcastId]) {
        episode = episodesCache[podcastId].find(e => String(e.id) === String(episodeId));
    }
    return episode || null;
}

// Update play/pause button
function updatePlayPauseButton() {
    const icon = document.getElementById('play-icon-bar');
    if (icon) {
        icon.textContent = isPlaying ? '⏸' : '▶';
    }
    // Also update player page button if it exists
    const playerPageIcon = document.getElementById('play-icon-player-page');
    if (playerPageIcon) {
        playerPageIcon.textContent = isPlaying ? '⏸' : '▶';
    }
    // Update episode detail page button - only if the displayed episode matches the playing episode
    const episodeDetailIcon = document.getElementById('episode-detail-play-icon');
    const episodeDetailText = document.getElementById('episode-detail-play-text');
    const episodeDetailBtn = document.getElementById('episode-detail-play-btn');
    if (episodeDetailIcon && episodeDetailText && episodeDetailBtn) {
        // Only update if we're viewing the episode that's actually playing
        const isDisplayedEpisodePlaying = displayedEpisode && currentEpisode && displayedEpisode.id === currentEpisode.id;
        if (isDisplayedEpisodePlaying) {
            episodeDetailIcon.textContent = isPlaying ? '⏸' : '▶';
            episodeDetailText.textContent = isPlaying ? 'Pause' : 'Play Episode';
            if (isPlaying) {
                episodeDetailBtn.classList.add('playing');
                episodeDetailBtn.setAttribute('onclick', 'togglePlayPause()');
            } else {
                episodeDetailBtn.classList.remove('playing');
                episodeDetailBtn.setAttribute('onclick', `playEpisode(${JSON.stringify(currentEpisode).replace(/"/g, '&quot;')})`);
            }
        } else if (displayedEpisode) {
            // If viewing a different episode, show "Play Episode"
            episodeDetailIcon.textContent = '▶';
            episodeDetailText.textContent = 'Play Episode';
            episodeDetailBtn.classList.remove('playing');
            episodeDetailBtn.setAttribute('onclick', `playEpisode(${JSON.stringify(displayedEpisode).replace(/"/g, '&quot;')})`);
        }
    }
    
    // Update episode list play buttons and highlighting in-place (preserve scroll position)
    if (currentPage === 'episodes' && currentPodcast) {
        updateEpisodeListInPlace();
    }
    
    // Update history page play buttons and highlighting in-place
    if (currentPage === 'history') {
        updateEpisodeListInPlace();
    }
    
    // Update all-episodes page if visible
    if (currentPage === 'all-episodes') {
        updateEpisodeListInPlace();
    }
    
    // Update favorites page if visible
    if (currentPage === 'favorites') {
        updateEpisodeListInPlace();
    }
    
    // Update Recently Listened / homepage small play buttons (Library and personalized homepage)
    document.querySelectorAll('.btn-episode-play-small').forEach(btn => {
        const episodeId = btn.getAttribute('data-episode-id');
        const podcastId = btn.getAttribute('data-podcast-id');
        if (!episodeId || !podcastId) return;
        const episode = findEpisodeByIdAndPodcast(episodeId, podcastId);
        const isCurrent = currentEpisode && String(currentEpisode.id) === String(episodeId);
        const playing = isCurrent && isPlaying;
        const span = btn.querySelector('span');
        if (span) span.textContent = playing ? '⏸' : '▶';
        btn.classList.toggle('playing', playing);
        btn.removeAttribute('onclick');
        btn.onclick = function(e) {
            e.stopPropagation();
            if (playing) togglePlayPause();
            else {
                const ep = episode || findEpisodeByIdAndPodcast(episodeId, podcastId);
                if (ep) playEpisode(ep);
            }
        };
    });
    
    // Update episode detail page favorite button if visible
    if (currentPage === 'episode' && displayedEpisode) {
        const favoriteBtn = document.querySelector('.btn-favorite-episode-detail');
        if (favoriteBtn) {
            const isFavorite = isEpisodeFavorited(displayedEpisode.id);
            favoriteBtn.classList.toggle('favorited', isFavorite);
            favoriteBtn.innerHTML = isFavorite ? '❤️' : '🤍';
            favoriteBtn.setAttribute('title', isFavorite ? 'Remove from favorites' : 'Add to favorites');
        }
    }
}

// Update player bar info
function updatePlayerBar() {
    if (!currentEpisode) return;
    
    document.getElementById('player-bar-title').textContent = currentEpisode.title || 'Now Playing';
    document.getElementById('player-bar-episode').textContent = currentPodcast ? currentPodcast.title : 'Podcast';
    
    // Update artwork
    const imgEl = document.getElementById('player-bar-image');
        if (imgEl && currentPodcast?.image_url) {
        imgEl.src = sanitizeImageUrl(currentPodcast.image_url) || getPlaceholderImage();
        imgEl.style.display = 'block';
    }
}

// Seek to position in progress bar
function seekToPosition(event) {
    if (!audioPlayer || !currentEpisode) return;
    
    const progressBar = document.getElementById('player-bar-progress');
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * audioPlayer.duration;
    
    if (!isNaN(newTime) && isFinite(newTime)) {
        const oldTime = audioPlayer.currentTime;
        audioPlayer.currentTime = Math.max(0, Math.min(newTime, audioPlayer.duration));
        
        // Track seek
        if (window.analytics && currentPodcast) {
            window.analytics.trackEpisodeSeek(
                currentEpisode,
                oldTime,
                audioPlayer.currentTime,
                audioPlayer.duration
            );
        }
    }
}

// Setup audio player event listeners
function setupAudioPlayer() {
    if (!audioPlayer) return;
    
    // Set initial playback speed and volume
    audioPlayer.playbackRate = playbackSpeed;
    audioPlayer.volume = volume;
    
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        updatePlayPauseButton();
        updateSleepTimerUI(); // Update sidebar timer visibility
    });
    
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayPauseButton();
        updateSleepTimerUI(); // Update sidebar timer visibility
    });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        const duration = formatTime(audioPlayer.duration);
        document.getElementById('duration-bar').textContent = duration;
        // Ensure playback speed and volume are set
        audioPlayer.playbackRate = playbackSpeed;
        audioPlayer.volume = volume;
        if (currentPage === 'player') {
            loadPlayerPage();
        }
    });
    
    audioPlayer.addEventListener('timeupdate', () => {
        const current = formatTime(audioPlayer.currentTime);
        document.getElementById('current-time-bar').textContent = current;
        
        // Update progress bar
        if (audioPlayer.duration) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            const progressFill = document.getElementById('player-bar-progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            
            // Track episode progress milestones
            if (window.analytics && currentEpisode) {
                window.analytics.trackEpisodeProgress(
                    currentEpisode, 
                    audioPlayer.currentTime, 
                    audioPlayer.duration
                );
            }
        }
        
        // Save progress every 5 seconds
        if (Math.floor(audioPlayer.currentTime) % 5 === 0) {
            saveProgress();
        }
        
        // Update player page if visible
        if (currentPage === 'player' && document.getElementById('player-page-content')) {
            const progress = audioPlayer.duration ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
            const progressFill = document.querySelector('.player-page-progress .progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            const currentTimeEl = document.getElementById('player-page-current-time');
            const durationEl = document.getElementById('player-page-duration');
            if (currentTimeEl) {
                currentTimeEl.textContent = current;
            }
            if (durationEl && audioPlayer.duration) {
                durationEl.textContent = formatTime(audioPlayer.duration);
            }
        }
        
        // Update episode detail page if visible
        if (currentPage === 'episode') {
            const progress = audioPlayer.duration ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
            const progressBars = document.querySelectorAll('.episode-detail .progress-fill');
            progressBars.forEach(bar => {
                bar.style.width = `${progress}%`;
            });
        }
        
        // Update progress bars in episode lists (episodes page, all episodes, history, etc.)
        if (currentEpisode && audioPlayer.duration) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            // Find all episode items that are currently playing
            const playingEpisodeItems = document.querySelectorAll('.episode-item.episode-playing');
            playingEpisodeItems.forEach(item => {
                const progressFill = item.querySelector('.progress-bar .progress-fill');
                if (progressFill) {
                    progressFill.style.width = `${progress}%`;
                }
                // Also update the progress text percentage
                const progressText = item.querySelector('.episode-progress-text');
                if (progressText) {
                    progressText.textContent = `${Math.round(progress)}%`;
                }
            });
        }
    });
    
    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayPauseButton();
        // Mark as completed
        if (currentEpisode) {
            saveEpisodeProgress(currentEpisode.id, 100);
            // Track episode completion
            if (window.analytics && currentPodcast) {
                window.analytics.trackEpisodeEnd(
                    currentEpisode, 
                    currentPodcast, 
                    audioPlayer.duration
                );
            }
            
            // Auto-play next episode if enabled
            if (autoPlayEnabled) {
                playNextInQueue();
            }
        }
    });
    
    // Save progress before page unload
    window.addEventListener('beforeunload', () => {
        saveProgress();
    });
}

// Save progress to localStorage
function saveProgress() {
    if (!currentEpisode || !audioPlayer || !audioPlayer.duration) return;
    
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    saveEpisodeProgress(currentEpisode.id, progress);
}

// Save episode progress
function saveEpisodeProgress(episodeId, progress) {
    try {
        const allProgress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        allProgress[episodeId] = {
            progress: progress,
            timestamp: Date.now()
        };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
        debouncedSync(); // Sync to server if enabled
    } catch (e) {
        console.error('Error saving progress:', e);
    }
}

// Get episode progress
function getEpisodeProgress(episodeId) {
    try {
        const allProgress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        return allProgress[episodeId]?.progress || 0;
    } catch (e) {
        return 0;
    }
}

// Restore progress when page loads
function restoreProgress() {
    // Progress is restored when episode is played
}

// Format time (seconds to MM:SS or HH:MM:SS)
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Format duration (seconds to human readable)
function formatDuration(seconds) {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
        return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        if (typeof dateString === 'number') {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return dateString;
    }
}

// Get placeholder image
function getPlaceholderImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE5MUEyNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
}

// Extract dominant color from image for gradient
window.extractColorFromImage = async function(img) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample colors from center area
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const sampleSize = Math.min(50, Math.floor(canvas.width * 0.3));
        
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let y = centerY - sampleSize; y < centerY + sampleSize; y += 5) {
            for (let x = centerX - sampleSize; x < centerX + sampleSize; x += 5) {
                if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                    const idx = (y * canvas.width + x) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }
        }
        
        if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            
            // Make it slightly darker and more muted for subtle gradient
            r = Math.floor(r * 0.7);
            g = Math.floor(g * 0.7);
            b = Math.floor(b * 0.7);
            
            const headerEl = document.getElementById('episodes-page-header');
            if (headerEl) {
                headerEl.style.background = `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.15) 0%, rgba(${r}, ${g}, ${b}, 0) 100%)`;
            }
        }
    } catch (e) {
        // Fallback if color extraction fails
        console.log('Color extraction failed, using default');
    }
};

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sanitize HTML to allow safe tags (like links) while preventing XSS
function sanitizeHtml(html) {
    if (!html) return '';
    
    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // List of allowed HTML tags
    const allowedTags = ['a', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'];
    
    // Allowed attributes for anchor tags
    const allowedAttributes = {
        'a': ['href', 'target', 'rel'],
        'span': ['style'],
        'div': ['style'],
        'p': ['style']
    };
    
    // Recursively sanitize the DOM tree
    function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.cloneNode(true);
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            // Remove disallowed tags and script tags
            if (!allowedTags.includes(tagName) || tagName === 'script' || tagName === 'iframe' || tagName === 'object' || tagName === 'embed') {
                // Return its children as document fragment
                const fragment = document.createDocumentFragment();
                Array.from(node.childNodes).forEach(child => {
                    const sanitized = sanitizeNode(child);
                    if (sanitized) {
                        fragment.appendChild(sanitized);
                    }
                });
                return fragment;
            }
            
            // Create a new element with the same tag
            const newNode = document.createElement(tagName);
            
            // Copy allowed attributes
            const allowedAttrs = allowedAttributes[tagName] || [];
            Array.from(node.attributes).forEach(attr => {
                if (allowedAttrs.includes(attr.name.toLowerCase())) {
                    // Special handling for href to ensure it's safe
                    if (attr.name.toLowerCase() === 'href') {
                        const href = attr.value;
                        // Allow http, https, mailto, and relative URLs
                        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('/') || href.startsWith('#')) {
                            newNode.setAttribute('href', href);
                            // Ensure rel="noopener" for external links
                            if ((href.startsWith('http://') || href.startsWith('https://')) && !href.startsWith(window.location.origin)) {
                                newNode.setAttribute('rel', 'noopener noreferrer');
                                newNode.setAttribute('target', '_blank');
                            }
                        }
                    } else {
                        newNode.setAttribute(attr.name, attr.value);
                    }
                }
            });
            
            // Recursively sanitize children
            Array.from(node.childNodes).forEach(child => {
                const sanitized = sanitizeNode(child);
                if (sanitized) {
                    if (sanitized.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                        Array.from(sanitized.childNodes).forEach(c => newNode.appendChild(c));
                    } else {
                        newNode.appendChild(sanitized);
                    }
                }
            });
            
            return newNode;
        }
        
        return null;
    }
    
    // Sanitize all nodes in the temp div
    const fragment = document.createDocumentFragment();
    Array.from(temp.childNodes).forEach(node => {
        const sanitized = sanitizeNode(node);
        if (sanitized) {
            if (sanitized.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                Array.from(sanitized.childNodes).forEach(c => fragment.appendChild(c));
            } else {
                fragment.appendChild(sanitized);
            }
        }
    });
    
    // Convert back to HTML string
    temp.innerHTML = '';
    temp.appendChild(fragment);
    return temp.innerHTML;
}

// ============================================
// Authentication & Sync Functions
// ============================================

// Setup authentication state listeners
function setupAuth() {
    // Handle email confirmation redirect
    handleEmailConfirmation();
    
    // Check if user is already signed in
    authService.getSession().then(session => {
        if (session) {
            updateAuthUI(session.user);
            syncEnabled = true;
            // Sync on page load
            syncFromServer();
        } else {
            updateAuthUI(null);
        }
    });

    // Listen for auth state changes
    authService.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            updateAuthUI(session.user);
            syncEnabled = true;
            // Sync strategy on sign in:
            // 1. Upload local data to server (merges with existing server data)
            // 2. Download server data to local (merges with local, server is source of truth)
            // This ensures both local and server have the complete merged dataset
            await syncToServer(); // Upload local data (merges with server)
            await syncFromServer(); // Download merged data back (updates local)
        } else if (event === 'SIGNED_OUT') {
            updateAuthUI(null);
            syncEnabled = false;
            localStorage.removeItem('user_sync_enabled');
            localStorage.removeItem(USER_VISIBLE_CATEGORIES_KEY);
        }
    });
}

// Handle email confirmation redirect
async function handleEmailConfirmation() {
    const client = authService.getSupabaseClient();
    if (!client) return;
    
    // Check for hash fragments from email confirmation
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
        // User clicked password reset link
        if (accessToken) {
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Wait a moment for session to be established
            setTimeout(async () => {
                const session = await authService.getSession();
                if (session) {
                    // Show password reset form
                    const modal = document.getElementById('auth-modal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        switchAuthMode('reset');
                        showAuthSuccess('Please enter your new password.');
                    }
                }
            }, 500);
        }
    } else if (type === 'signup') {
        // User clicked email confirmation link
        // Supabase client should handle this automatically, but we can show a message
        if (accessToken) {
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Wait a moment for session to be established
            setTimeout(async () => {
                const session = await authService.getSession();
                if (session) {
                    updateAuthUI(session.user);
                    syncEnabled = true;
                    await syncToServer();
                    await syncFromServer();
                    // Show success message
                    const modal = document.getElementById('auth-modal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        showSignedInView(session.user);
                        showAuthSuccess('Email confirmed! You are now signed in.');
                    }
                }
            }, 500);
        }
    }
}

// Update auth UI based on user state
function updateAuthUI(user) {
    const authButton = document.getElementById('auth-button');
    if (!authButton) return;

    if (user) {
        authButton.textContent = user.email ? user.email.split('@')[0] : 'Account';
        authButton.classList.add('signed-in');
    } else {
        authButton.textContent = 'Save Progress';
        authButton.classList.remove('signed-in');
        userVisibleCategories = null;
    }
}

// Account dropdown (when signed in: click username opens this instead of modal)
window.closeAccountDropdown = function() {
    const dropdown = document.getElementById('account-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    document.removeEventListener('click', closeAccountDropdownOnClickOutside);
};

function closeAccountDropdownOnClickOutside(e) {
    const container = document.getElementById('auth-button-container');
    const dropdown = document.getElementById('account-dropdown');
    if (container && dropdown && !container.contains(e.target)) {
        closeAccountDropdown();
    }
}

function openAccountDropdown(user) {
    const dropdown = document.getElementById('account-dropdown');
    if (!dropdown) return;
    const emailEl = document.getElementById('account-dropdown-email');
    const statsEl = document.getElementById('account-dropdown-stats');
    if (emailEl) emailEl.textContent = user.email || 'Signed in';
    if (statsEl) {
        const history = getHistory();
        const favs = getFavorites();
        const queue = getQueue();
        const historyCount = history.length;
        const favCount = (favs.podcasts && favs.podcasts.length) + (favs.episodes && favs.episodes.length ? favs.episodes.length : 0);
        const queueCount = queue.length;
        statsEl.innerHTML = [
            historyCount ? `${historyCount} in listening history` : 'No listening history yet',
            favCount ? `${favCount} favorite${favCount !== 1 ? 's' : ''}` : null,
            queueCount ? `${queueCount} in queue` : null
        ].filter(Boolean).join(' · ') || 'Start playing to see your stats here.';
    }
    dropdown.classList.remove('hidden');
    setTimeout(() => document.addEventListener('click', closeAccountDropdownOnClickOutside), 0);
}

// Toggle auth modal (or account dropdown when signed in)
window.toggleAuthModal = async function() {
    const modal = document.getElementById('auth-modal');
    const dropdown = document.getElementById('account-dropdown');
    const user = await authService.getCurrentUser();
    
    if (user) {
        modal.classList.add('hidden');
        if (dropdown && dropdown.classList.contains('hidden')) {
            openAccountDropdown(user);
        } else {
            closeAccountDropdown();
        }
    } else {
        closeAccountDropdown();
        switchAuthMode('signup');
        modal.classList.toggle('hidden');
    }
};

// Close auth modal
window.closeAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('hidden');
    clearAuthMessages();
    closeAccountDropdown();
};

// Category preferences modal (Customize Library)
window.openCategoryPreferencesModal = function() {
    closeAccountDropdown();
    const savedMsg = document.getElementById('category-pref-saved-msg');
    const saveBtn = document.getElementById('category-pref-save-btn');
    if (savedMsg) savedMsg.classList.add('hidden');
    if (saveBtn) saveBtn.classList.remove('hidden');
    if (categories.length === 0) extractCategories();
    const listEl = document.getElementById('category-preferences-list');
    if (!listEl) return;
    const allCategories = ['Top 10', ...getCategoriesByPopularity()];
    const selected = userVisibleCategories && userVisibleCategories.length > 0 ? userVisibleCategories : null;
    const checkedSet = selected ? new Set(selected) : null;
    listEl.innerHTML = allCategories.map((cat, i) => {
        const isChecked = checkedSet === null || checkedSet.has(cat);
        const safeId = 'cat-pref-' + i;
        return `
            <label class="category-pref-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 0; cursor: pointer;">
                <input type="checkbox" class="category-pref-checkbox" data-category="${escapeHtml(cat)}" ${isChecked ? 'checked' : ''} id="${safeId}">
                <span>${escapeHtml(cat)}</span>
            </label>`;
    }).join('');
    document.getElementById('category-preferences-modal').classList.remove('hidden');
};

window.closeCategoryPreferencesModal = function() {
    document.getElementById('category-preferences-modal').classList.add('hidden');
};

window.selectAllCategoryPreferences = function() {
    document.querySelectorAll('#category-preferences-list .category-pref-checkbox').forEach(cb => { cb.checked = true; });
};

window.deselectAllCategoryPreferences = function() {
    document.querySelectorAll('#category-preferences-list .category-pref-checkbox').forEach(cb => { cb.checked = false; });
};

window.saveCategoryPreferences = function() {
    const savedMsg = document.getElementById('category-pref-saved-msg');
    const saveBtn = document.getElementById('category-pref-save-btn');
    try {
        const checkboxes = document.querySelectorAll('#category-preferences-list .category-pref-checkbox:checked');
        const allCheckboxes = document.querySelectorAll('#category-preferences-list .category-pref-checkbox');
        const selected = Array.from(checkboxes).map(el => el.getAttribute('data-category'));
        if (selected.length === 0 || selected.length === allCheckboxes.length) {
            userVisibleCategories = null;
        } else {
            userVisibleCategories = selected;
        }
        localStorage.setItem(USER_VISIBLE_CATEGORIES_KEY, JSON.stringify(userVisibleCategories));
        const containerEl = document.getElementById('podcast-container');
        if (containerEl && podcasts.length > 0) {
            if (categories.length === 0) extractCategories();
            renderLibraryWithCategoryRows();
        }
        if (syncEnabled) {
            const prefs = JSON.parse(localStorage.getItem(PODCAST_SORT_PREFERENCES_KEY) || '{}');
            syncToServer().catch(() => {});
        }
    } catch (e) {
        console.error('Save category preferences:', e);
    }
    // Always show feedback and close (even if save threw)
    if (savedMsg) savedMsg.classList.remove('hidden');
    if (saveBtn) saveBtn.classList.add('hidden');
    setTimeout(() => {
        if (savedMsg) savedMsg.classList.add('hidden');
        if (saveBtn) saveBtn.classList.remove('hidden');
        closeCategoryPreferencesModal();
    }, 1200);
};

// Switch between sign in and sign up
window.switchAuthMode = function(mode) {
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const forgotForm = document.getElementById('auth-forgot-form');
    const resetForm = document.getElementById('auth-reset-form');
    const signedinView = document.getElementById('auth-signedin');
    const modalTitle = document.getElementById('auth-modal-title');
    
    clearAuthMessages();
    
    // Hide all forms first
    signinForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    resetForm.classList.add('hidden');
    signedinView.classList.add('hidden');
    
    if (mode === 'signin') {
        signinForm.classList.remove('hidden');
        modalTitle.textContent = 'Sign In';
    } else if (mode === 'forgot') {
        forgotForm.classList.remove('hidden');
        modalTitle.textContent = 'Reset Password';
    } else if (mode === 'reset') {
        resetForm.classList.remove('hidden');
        modalTitle.textContent = 'Set New Password';
    } else {
        // Default to signup
        signupForm.classList.remove('hidden');
        modalTitle.textContent = 'Save Progress';
    }
};

// Show signed in view
function showSignedInView(user) {
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const signedinView = document.getElementById('auth-signedin');
    const modalTitle = document.getElementById('auth-modal-title');
    const userEmail = document.getElementById('auth-user-email');
    
    signinForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    signedinView.classList.remove('hidden');
    modalTitle.textContent = 'Your account';
    if (userEmail) {
        userEmail.textContent = user.email || 'User';
    }
    updateSyncStatus('Synced');
}

// Handle sign in
window.handleSignIn = async function() {
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    if (!email || !password) {
        showAuthError('Please enter email and password');
        return;
    }
    
    showAuthError('');
    const result = await authService.signIn(email, password);
    
    if (result.success) {
        showAuthSuccess('Signed in successfully! Syncing your data...');
        syncEnabled = true;
        
        // Sync strategy on sign in:
        // 1. Upload local data to server (merges with existing server data)
        // 2. Download server data to local (merges with local, server is source of truth)
        // This ensures both local and server have the complete merged dataset
        await syncToServer(); // Upload local data (merges with server)
        await syncFromServer(); // Download merged data back (updates local)
        
        setTimeout(() => {
            closeAuthModal();
        }, 1500);
    } else {
        showAuthError(result.error || 'Sign in failed');
    }
};

// Handle sign up
window.handleSignUp = async function() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    
    if (!email || !password || !passwordConfirm) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (password !== passwordConfirm) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    showAuthError('');
    const result = await authService.signUp(email, password);
    
    if (result.success) {
        showAuthSuccess('Account created! Please check your email to verify your account.');
        // After signup, user is automatically signed in
        syncEnabled = true;
        await syncToServer();
        setTimeout(() => {
            closeAuthModal();
        }, 2000);
    } else {
        showAuthError(result.error || 'Sign up failed');
    }
};

// Handle sign out
window.handleSignOut = async function() {
    const result = await authService.signOut();
    if (result.success) {
        syncEnabled = false;
        updateAuthUI(null);
        
        // Note: We keep localStorage data when signing out
        // This allows users to continue using the app offline
        // If they sign in with a different account later, data will merge
        // If they want to clear data, they can do it manually
        
        showAuthSuccess('Signed out successfully. Your local data is still saved.');
        setTimeout(() => {
            closeAuthModal();
        }, 1000);
    } else {
        showAuthError(result.error || 'Sign out failed');
    }
};

// Handle forgot password
window.handleForgotPassword = async function() {
    const email = document.getElementById('forgot-email').value;
    
    if (!email) {
        showAuthError('Please enter your email address');
        return;
    }
    
    showAuthError('');
    const result = await authService.resetPassword(email);
    
    if (result.success) {
        showAuthSuccess('Password reset link sent! Please check your email and click the link to reset your password.');
    } else {
        showAuthError(result.error || 'Failed to send reset link');
    }
};

// Handle reset password (after clicking email link)
window.handleResetPassword = async function() {
    const password = document.getElementById('reset-password').value;
    const passwordConfirm = document.getElementById('reset-password-confirm').value;
    
    if (!password || !passwordConfirm) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (password !== passwordConfirm) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    showAuthError('');
    const result = await authService.updatePassword(password);
    
    if (result.success) {
        showAuthSuccess('Password updated successfully! You can now sign in with your new password.');
        setTimeout(() => {
            switchAuthMode('signin');
            // Clear password fields
            document.getElementById('reset-password').value = '';
            document.getElementById('reset-password-confirm').value = '';
        }, 2000);
    } else {
        showAuthError(result.error || 'Failed to update password');
    }
};

// Show auth error message
function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.toggle('hidden', !message);
    }
    if (successEl) {
        successEl.classList.add('hidden');
    }
}

// Show auth success message
function showAuthSuccess(message) {
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    if (successEl) {
        successEl.textContent = message;
        successEl.classList.toggle('hidden', !message);
    }
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

// Clear auth messages
function clearAuthMessages() {
    showAuthError('');
    showAuthSuccess('');
}

// Update sync status
function updateSyncStatus(status) {
    const statusEl = document.getElementById('auth-sync-status');
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = 'auth-sync-status';
        if (status === 'Syncing...') {
            statusEl.classList.add('syncing');
        } else if (status.toLowerCase().includes('error')) {
            statusEl.classList.add('error');
        }
    }
}

// Sync local data to server
async function syncToServer() {
    if (!syncEnabled || isSyncing) return;
    
    try {
        isSyncing = true;
        updateSyncStatus('Syncing...');
        
        const userData = {
            progress: JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'),
            history: getHistory(),
            favorites: getFavorites(),
            sortPreferences: {
                ...JSON.parse(localStorage.getItem(PODCAST_SORT_PREFERENCES_KEY) || '{}'),
                visible_categories: JSON.parse(localStorage.getItem(USER_VISIBLE_CATEGORIES_KEY) || 'null')
            }
        };
        
        // Fetch existing data and merge
        const existing = await authService.fetchUserData();
        if (existing) {
            // Merge: combine local and server data (arrays get merged, objects get combined)
            // For history: if local is empty, replace server history (user cleared it)
            // Otherwise merge arrays and deduplicate by episodeId, keeping most recent
            let uniqueHistory;
            if (userData.history.length === 0) {
                // Local history is empty (intentionally cleared), replace server history
                uniqueHistory = [];
            } else {
                const combinedHistory = [...(existing.history || []), ...userData.history];
                uniqueHistory = combinedHistory.reduce((acc, item) => {
                    const existing = acc.find(i => i.episodeId === item.episodeId);
                    if (!existing || item.timestamp > existing.timestamp) {
                        if (existing) {
                            const index = acc.indexOf(existing);
                            acc[index] = item;
                        } else {
                            acc.push(item);
                        }
                    }
                    return acc;
                }, []);
                uniqueHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
            
            // For favorites: merge arrays and deduplicate
            // Episodes are objects with id property, so we need to deduplicate by id
            const combinedEpisodes = [...(existing.favorites?.episodes || []), ...userData.favorites.episodes];
            const uniqueEpisodes = combinedEpisodes.reduce((acc, item) => {
                const existing = acc.find(e => e.id === item.id);
                if (!existing) {
                    acc.push(item);
                }
                return acc;
            }, []);
            
            const mergedFavorites = {
                podcasts: [...new Set([...(existing.favorites?.podcasts || []), ...userData.favorites.podcasts])],
                episodes: uniqueEpisodes,
                authors: [...new Set([...(existing.favorites?.authors || []), ...userData.favorites.authors])]
            };
            
            const merged = {
                progress: { ...existing.progress, ...userData.progress },
                history: uniqueHistory,
                favorites: mergedFavorites,
                sortPreferences: {
                    ...existing.sort_preferences,
                    ...userData.sortPreferences,
                    visible_categories: userData.sortPreferences.visible_categories !== undefined ? userData.sortPreferences.visible_categories : existing.sort_preferences?.visible_categories
                }
            };
            await authService.syncUserData(merged);
        } else {
            // No existing data, just save current
            await authService.syncUserData(userData);
        }
        
        updateSyncStatus('Synced');
    } catch (error) {
        console.error('Sync to server error:', error);
        updateSyncStatus('Sync error');
    } finally {
        isSyncing = false;
    }
}

// Sync server data to local
async function syncFromServer() {
    if (!syncEnabled || isSyncing) return;
    
    try {
        isSyncing = true;
        updateSyncStatus('Syncing...');
        
        const serverData = await authService.fetchUserData();
        
        if (serverData) {
            // Smart merge: prefer newer data based on timestamps
            // For arrays (history, favorites): merge and deduplicate
            // For objects (progress, preferences): merge, prefer server for conflicts but keep local if newer
            
            if (serverData.progress) {
                const localProgress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
                // Merge progress: server takes precedence (it's the source of truth when signed in)
                const merged = { ...localProgress, ...serverData.progress };
                localStorage.setItem(PROGRESS_KEY, JSON.stringify(merged));
            }
            
            if (serverData.history) {
                const localHistory = getHistory();
                // If local history is empty (intentionally cleared), don't merge server history back
                // Otherwise merge history arrays, deduplicate, keep most recent
                if (localHistory.length === 0) {
                    // Local history was cleared, keep it empty
                    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
                } else {
                    const combined = [...localHistory, ...serverData.history];
                    // Remove duplicates by episodeId, keep most recent
                    const unique = combined.reduce((acc, item) => {
                        const existing = acc.find(i => i.episodeId === item.episodeId);
                        if (!existing || item.timestamp > existing.timestamp) {
                            if (existing) {
                                const index = acc.indexOf(existing);
                                acc[index] = item;
                            } else {
                                acc.push(item);
                            }
                        }
                        return acc;
                    }, []);
                    // Sort by timestamp (newest first) and limit
                    unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(unique.slice(0, MAX_HISTORY)));
                }
            }
            
            if (serverData.favorites) {
                const localFavorites = getFavorites();
                // Merge favorites: combine arrays and deduplicate
                // Episodes are objects with id property, so we need to deduplicate by id
                const combinedEpisodes = [...localFavorites.episodes, ...(serverData.favorites.episodes || [])];
                const uniqueEpisodes = combinedEpisodes.reduce((acc, item) => {
                    const existing = acc.find(e => e.id === item.id);
                    if (!existing) {
                        acc.push(item);
                    }
                    return acc;
                }, []);
                
                const merged = {
                    podcasts: [...new Set([...localFavorites.podcasts, ...(serverData.favorites.podcasts || [])])],
                    episodes: uniqueEpisodes,
                    authors: [...new Set([...localFavorites.authors, ...(serverData.favorites.authors || [])])]
                };
                saveFavorites(merged);
            }
            
            if (serverData.sort_preferences) {
                const localPrefs = JSON.parse(localStorage.getItem(PODCAST_SORT_PREFERENCES_KEY) || '{}');
                const merged = { ...localPrefs, ...serverData.sort_preferences };
                localStorage.setItem(PODCAST_SORT_PREFERENCES_KEY, JSON.stringify(merged));
                restorePodcastSortPreferences();
                if (serverData.sort_preferences.visible_categories !== undefined) {
                    userVisibleCategories = Array.isArray(serverData.sort_preferences.visible_categories) ? serverData.sort_preferences.visible_categories : null;
                    localStorage.setItem(USER_VISIBLE_CATEGORIES_KEY, JSON.stringify(userVisibleCategories));
                }
            }
            
            // Refresh UI
            renderSidebar();
            if (currentPage === 'grid') {
                renderLibraryWithCategoryRows();
            }
            if (currentPage === 'favorites') {
                loadFavoritesPage();
            } else if (currentPage === 'history') {
                loadRecentlyListenedPage();
            }
        }
        
        updateSyncStatus('Synced');
    } catch (error) {
        console.error('Sync from server error:', error);
        updateSyncStatus('Sync error');
    } finally {
        isSyncing = false;
    }
}

// Debounced sync function (call after data changes)
let syncTimeout = null;
function debouncedSync() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        if (syncEnabled) {
            syncToServer();
        }
    }, 2000); // Sync 2 seconds after last change
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Allow Cmd/Ctrl+K for search even in inputs
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openSearchModal();
        }
        return;
    }
    
    // Space: Play/Pause
    if (e.key === ' ' && currentEpisode) {
        e.preventDefault();
        togglePlayPause();
    }
    // Arrow Left: Skip backward 10s
    else if (e.key === 'ArrowLeft' && currentEpisode) {
        e.preventDefault();
        skipBackward();
    }
    // Arrow Right: Skip forward 30s
    else if (e.key === 'ArrowRight' && currentEpisode) {
        e.preventDefault();
        skipForward();
    }
    // Cmd/Ctrl+K: Open search
    else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
    }
    // Cmd/Ctrl+Arrow Up: Increase volume
    else if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp' && currentEpisode) {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.1));
    }
    // Cmd/Ctrl+Arrow Down: Decrease volume
    else if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown' && currentEpisode) {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
    }
    // Escape: Close modals/menus
    else if (e.key === 'Escape') {
        const modal = document.getElementById('search-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeSearchModal();
            e.preventDefault();
            e.stopPropagation();
        }
        closePlaybackSpeedMenu();
        closeVolumeControl();
        closeSleepTimerMenu();
    }
});
