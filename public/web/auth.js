// Authentication service for optional user accounts and cross-device sync

class AuthService {
  constructor() {
    if (!SUPABASE_CONFIG.url.includes('YOUR-PROJECT') && !SUPABASE_CONFIG.anonKey.includes('YOUR')) {
      this.supabaseUrl = SUPABASE_CONFIG.url;
      this.supabaseAnonKey = SUPABASE_CONFIG.anonKey;
      this._client = null; // Cache the client instance
    } else {
      console.error('Please configure your Supabase credentials in config.js');
    }
  }

  // Initialize Supabase client (using CDN) - singleton pattern
  getSupabaseClient() {
    if (typeof supabase === 'undefined') {
      console.error('Supabase client not loaded. Make sure to include Supabase JS in index.html');
      return null;
    }
    
    // Return cached client if it exists
    if (this._client) {
      return this._client;
    }
    
    // Create client once and cache it
    this._client = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
    return this._client;
  }

  // Sign up with email and password
  async signUp(email, password) {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      // Use current page URL as redirect URL for email confirmation
      const redirectUrl = window.location.origin + window.location.pathname;
      
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut() {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      const { error } = await client.auth.signOut();
      if (error) throw error;
      
      // Clear local storage sync flag
      localStorage.removeItem('user_sync_enabled');
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const client = this.getSupabaseClient();
      if (!client) return null;
      
      const { data: { user }, error } = await client.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Get current session
  async getSession() {
    try {
      const client = this.getSupabaseClient();
      if (!client) return null;
      
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    const client = this.getSupabaseClient();
    if (!client) return null;
    
    return client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // Sync user data to server (upsert)
  async syncUserData(userData) {
    try {
      const session = await this.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use PATCH with upsert logic (check if exists, then update or insert)
      const existing = await this.fetchUserData();
      
      const dataToSave = {
        user_id: session.user.id,
        progress: userData.progress || {},
        history: userData.history || [],
        favorites: userData.favorites || { podcasts: [], episodes: [] },
        sort_preferences: userData.sortPreferences || {},
        updated_at: new Date().toISOString()
      };

      let response;
      if (existing) {
        // Update existing record
        response = await fetch(`${this.supabaseUrl}/rest/v1/user_data?user_id=eq.${session.user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(dataToSave)
        });
      } else {
        // Insert new record
        response = await fetch(`${this.supabaseUrl}/rest/v1/user_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(dataToSave)
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Sync user data error:', error);
      throw error;
    }
  }

  // Fetch user data from server
  async fetchUserData() {
    try {
      const session = await this.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.supabaseUrl}/rest/v1/user_data?user_id=eq.${session.user.id}&select=*`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No user data yet, return empty
          return null;
        }
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Fetch user data error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const authService = new AuthService();

