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
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async fetchPodcasts() {
    const query = '?select=id,feed_url,title,author,image_url,genre&order=title.asc';
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
}

// Create singleton instance
const apiService = new APIService();

