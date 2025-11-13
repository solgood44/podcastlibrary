// API service for fetching data from Supabase

class APIService {
  constructor() {
    if (!SUPABASE_CONFIG.url.includes('YOUR-PROJECT') && !SUPABASE_CONFIG.anonKey.includes('YOUR')) {
      this.baseURL = `${SUPABASE_CONFIG.url}/rest/v1`;
      this.anonKey = SUPABASE_CONFIG.anonKey;
    } else {
      console.error('Please configure your Supabase credentials in config.js');
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
    return await this.request(`/podcasts${query}`);
  }

  async fetchEpisodes(podcastId) {
    const query = `?select=id,podcast_id,title,description,audio_url,pub_date,duration_seconds&podcast_id=eq.${podcastId}&order=pub_date.desc`;
    return await this.request(`/episodes${query}`);
  }

  async fetchAllEpisodes() {
    const query = '?select=id,podcast_id,title,description,audio_url,pub_date,duration_seconds&order=pub_date.desc';
    return await this.request(`/episodes${query}`);
  }

  async fetchAuthorDescriptions() {
    const query = '?select=name,description&order=name.asc';
    return await this.request(`/authors${query}`);
  }

  async fetchAuthorDescription(authorName) {
    const query = `?select=name,description&name=eq.${encodeURIComponent(authorName)}`;
    const results = await this.request(`/authors${query}`);
    return results.length > 0 ? results[0] : null;
  }

  async fetchSounds() {
    const query = '?select=id,title,description,audio_url,image_url,duration_seconds,category,is_premium&order=title.asc';
    return await this.request(`/sounds${query}`);
  }
}

// Create singleton instance
const apiService = new APIService();

