// API service for fetching data from Supabase
// Includes client-side caching to reduce redundant API calls and egress

class APIService {
  constructor() {
    if (!SUPABASE_CONFIG.url.includes('YOUR-PROJECT') && !SUPABASE_CONFIG.anonKey.includes('YOUR')) {
      this.baseURL = `${SUPABASE_CONFIG.url}/rest/v1`;
      this.anonKey = SUPABASE_CONFIG.anonKey;
    } else {
      console.error('Please configure your Supabase credentials in config.js');
    }
    
    // Client-side cache with TTL (Time To Live)
    this.cache = new Map();
    this.cacheTTL = {
      podcasts: 5 * 60 * 1000,      // 5 minutes
      episodes: 10 * 60 * 1000,     // 10 minutes
      authors: 30 * 60 * 1000,      // 30 minutes
      sounds: 15 * 60 * 1000         // 15 minutes
    };
  }
  
  // Get cache key for a request
  _getCacheKey(endpoint, params = {}) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }
  
  // Check if cached data is still valid
  _isCacheValid(cacheKey, ttl) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < ttl;
  }
  
  // Get from cache or fetch
  async _cachedRequest(endpoint, options = {}, cacheKey, ttl) {
    // Check cache first
    if (cacheKey && this._isCacheValid(cacheKey, ttl)) {
      console.log(`[Cache HIT] ${endpoint}`);
      return this.cache.get(cacheKey).data;
    }
    
    // Fetch from API
    console.log(`[Cache MISS] ${endpoint}`);
    const data = await this.request(endpoint, options);
    
    // Store in cache
    if (cacheKey && ttl) {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
    
    return data;
  }
  
  // Clear cache (useful after updates)
  clearCache(type = null) {
    if (type) {
      // Clear specific cache type
      for (const key of this.cache.keys()) {
        if (key.startsWith(type)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  async request(endpoint, options = {}) {
    if (!this.baseURL) {
      throw new Error('Supabase not configured. Please check config.js');
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.anonKey}`,
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: response.statusText,
          code: response.status === 404 ? 'NOT_FOUND' : 'UNKNOWN',
          hint: `Endpoint: ${endpoint}`
        }));
        
        // Provide more helpful error messages
        if (response.status === 404) {
          throw new Error(`Table not found: ${endpoint.split('?')[0]}. Please check if the table exists in Supabase and RLS policies allow access.`);
        }
        
        throw new Error(errorData.message || errorData.hint || `HTTP error! status: ${response.status} - Endpoint: ${endpoint}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', {
        endpoint,
        url,
        error: error.message
      });
      throw error;
    }
  }

  async fetchPodcasts() {
    const query = '?select=id,feed_url,title,author,image_url,genre,description&order=title.asc';
    const cacheKey = this._getCacheKey('/podcasts', {});
    const podcasts = await this._cachedRequest(`/podcasts${query}`, {}, cacheKey, this.cacheTTL.podcasts);
    // EMERGENCY MODE: Sanitize Supabase Storage image URLs
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
      return podcasts.map(podcast => {
        if (podcast.image_url && (podcast.image_url.includes('/storage/v1/object/public/') || podcast.image_url.includes('supabase.co/storage'))) {
          podcast.image_url = null; // Will use placeholder
        }
        return podcast;
      });
    }
    return podcasts;
  }

  async fetchEpisodes(podcastId, limit = 50, offset = 0) {
    const query = `?select=id,podcast_id,title,description,audio_url,pub_date,duration_seconds&podcast_id=eq.${podcastId}&order=pub_date.desc&limit=${limit}&offset=${offset}`;
    const cacheKey = this._getCacheKey('/episodes', { podcastId, limit, offset });
    return await this._cachedRequest(`/episodes${query}`, {}, cacheKey, this.cacheTTL.episodes);
  }

  async fetchAllEpisodes() {
    const query = '?select=id,podcast_id,title,description,audio_url,pub_date,duration_seconds&order=pub_date.desc';
    const cacheKey = this._getCacheKey('/episodes/all', {});
    return await this._cachedRequest(`/episodes${query}`, {}, cacheKey, this.cacheTTL.episodes);
  }

  async fetchAuthorDescriptions() {
    const query = '?select=name,description&order=name.asc';
    const cacheKey = this._getCacheKey('/authors', {});
    return await this._cachedRequest(`/authors${query}`, {}, cacheKey, this.cacheTTL.authors);
  }

  async fetchAuthorDescription(authorName) {
    const query = `?select=name,description&name=eq.${encodeURIComponent(authorName)}`;
    const cacheKey = this._getCacheKey('/authors', { name: authorName });
    const results = await this._cachedRequest(`/authors${query}`, {}, cacheKey, this.cacheTTL.authors);
    return results.length > 0 ? results[0] : null;
  }

  async fetchSounds() {
    const query = '?select=id,title,description,audio_url,image_url,duration_seconds,category,is_premium&order=title.asc';
    const cacheKey = this._getCacheKey('/sounds', {});
    const sounds = await this._cachedRequest(`/sounds${query}`, {}, cacheKey, this.cacheTTL.sounds);
    // EMERGENCY MODE: Sanitize Supabase Storage image URLs
    if (typeof EMERGENCY_EGRESS_HALT !== 'undefined' && EMERGENCY_EGRESS_HALT) {
      return sounds.map(sound => {
        if (sound.image_url && (sound.image_url.includes('/storage/v1/object/public/') || sound.image_url.includes('supabase.co/storage'))) {
          sound.image_url = null; // Will use placeholder
        }
        return sound;
      });
    }
    return sounds;
  }
}

// Create singleton instance
const apiService = new APIService();

