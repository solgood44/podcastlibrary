// Supabase client for server-side rendering
// Uses the same config as the client-side app

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wraezzmgoiubkjkgapwm.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYWV6em1nb2l1Ymtqa2dhcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzQzODIsImV4cCI6MjA3NzY1MDM4Mn0.PJdZy1hOiVVdgQQT-pMeaXDdDTJPIufN9_Zegtcxiwo';

// Generate URL-friendly slug from title
export function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export async function fetchPodcastBySlug(slug) {
  try {
    console.log('fetchPodcastBySlug: Looking for slug:', slug);
    // Fetch all podcasts and find by slug
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?select=*`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Supabase response not OK:', response.status, response.statusText);
      throw new Error('Failed to fetch podcasts');
    }

    const podcasts = await response.json();
    console.log('fetchPodcastBySlug: Fetched', podcasts.length, 'podcasts');
    
    // Generate slug and find matching podcast
    const podcast = podcasts.find(p => {
      const podcastSlug = generateSlug(p.title || '');
      if (podcastSlug === slug) {
        console.log('fetchPodcastBySlug: Found match:', p.title, '->', podcastSlug);
      }
      return podcastSlug === slug;
    });

    if (!podcast) {
      console.log('fetchPodcastBySlug: No podcast found for slug:', slug);
      // Log first few slugs for debugging
      podcasts.slice(0, 3).forEach(p => {
        console.log('  Example:', p.title, '->', generateSlug(p.title || ''));
      });
    }

    return podcast || null;
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return null;
  }
}

export async function fetchAllPodcasts() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?select=*&order=title.asc`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch podcasts');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    return [];
  }
}

export async function fetchEpisodesByPodcastId(podcastId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/episodes?podcast_id=eq.${podcastId}&select=*&order=pub_date.desc&limit=50`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch episodes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }
}

export async function fetchAuthorBySlug(slug) {
  try {
    // Fetch all podcasts to get unique authors
    const podcasts = await fetchAllPodcasts();
    
    // Extract unique authors and find matching one
    const authors = [...new Set(podcasts.map(p => p.author).filter(Boolean))];
    const author = authors.find(a => generateSlug(a) === slug);
    
    return author || null;
  } catch (error) {
    console.error('Error fetching author:', error);
    return null;
  }
}

export async function fetchPodcastsByAuthor(authorName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?author=eq.${encodeURIComponent(authorName)}&select=*&order=title.asc`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch podcasts by author');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching podcasts by author:', error);
    return [];
  }
}

export async function fetchAuthorDescription(authorName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/authors?name=eq.${encodeURIComponent(authorName)}&select=description`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    return results.length > 0 ? results[0].description : null;
  } catch (error) {
    console.error('Error fetching author description:', error);
    return null;
  }
}

export async function fetchAllAuthors() {
  try {
    const podcasts = await fetchAllPodcasts();
    const authors = [...new Set(podcasts.map(p => p.author).filter(Boolean))];
    return authors.sort();
  } catch (error) {
    console.error('Error fetching authors:', error);
    return [];
  }
}

