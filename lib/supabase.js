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
    // Use slug column for direct query - much more efficient!
    // This fetches only ONE podcast instead of all podcasts
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?slug=eq.${encodeURIComponent(slug)}&select=id,feed_url,title,author,image_url,description,genre,is_private`,
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
      // Fallback to old method if slug column doesn't exist yet
      if (response.status === 400 || response.status === 404) {
        console.log('Slug column may not exist, falling back to full fetch');
        return await fetchPodcastBySlugFallback(slug);
      }
      throw new Error('Failed to fetch podcast');
    }

    const podcasts = await response.json();
    
    if (podcasts && podcasts.length > 0) {
      console.log('fetchPodcastBySlug: Found podcast:', podcasts[0].title);
      return podcasts[0];
    }

    // If no result, try fallback method (for backward compatibility)
    console.log('fetchPodcastBySlug: No podcast found with slug, trying fallback');
    return await fetchPodcastBySlugFallback(slug);
  } catch (error) {
    console.error('Error fetching podcast:', error);
    // Try fallback on error
    return await fetchPodcastBySlugFallback(slug);
  }
}

// Fallback method for backward compatibility (before slug column migration)
async function fetchPodcastBySlugFallback(slug) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?select=id,feed_url,title,author,image_url,description,genre,is_private`,
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

    const podcasts = await response.json();
    const podcast = podcasts.find(p => generateSlug(p.title || '') === slug);
    return podcast || null;
  } catch (error) {
    console.error('Error in fallback fetch:', error);
    return null;
  }
}

export async function fetchAllPodcasts() {
  try {
    // Only select columns we actually need - exclude large fields when not necessary
    // For listing pages, we don't need full descriptions
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?select=id,feed_url,title,author,image_url,description,genre,is_private&order=title.asc`,
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

export async function fetchEpisodesByPodcastId(podcastId, limit = 50, offset = 0) {
  try {
    // Select only needed columns - exclude transcript (large field) unless specifically needed
    // Added pagination support to reduce data transfer for podcasts with many episodes
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/episodes?podcast_id=eq.${podcastId}&select=id,podcast_id,guid,title,description,audio_url,pub_date,duration_seconds,image_url&order=pub_date.desc&limit=${limit}&offset=${offset}`,
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
    // Filter out authors containing ".com"
    const authors = [...new Set(
      podcasts
        .map(p => p.author)
        .filter(Boolean)
        .filter(author => !author.toLowerCase().includes('.com'))
    )];
    const author = authors.find(a => generateSlug(a) === slug);
    
    return author || null;
  } catch (error) {
    console.error('Error fetching author:', error);
    return null;
  }
}

export async function fetchPodcastsByAuthor(authorName) {
  try {
    // Select only needed columns for author page
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/podcasts?author=eq.${encodeURIComponent(authorName)}&select=id,feed_url,title,author,image_url,description,genre,is_private&order=title.asc`,
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

export async function fetchAuthorImageUrl(authorName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/authors?name=eq.${encodeURIComponent(authorName)}&select=image_url`,
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
    return results.length > 0 && results[0].image_url ? results[0].image_url : null;
  } catch (error) {
    console.error('Error fetching author image URL:', error);
    return null;
  }
}

export async function fetchAllAuthors() {
  try {
    const podcasts = await fetchAllPodcasts();
    // Filter out authors containing ".com" and only include authors with public podcasts
    const authors = [...new Set(
      podcasts
        .filter(p => !p.is_private) // Only include public podcasts
        .map(p => p.author)
        .filter(Boolean)
        .filter(author => !author.toLowerCase().includes('.com'))
    )];
    return authors.sort();
  } catch (error) {
    console.error('Error fetching authors:', error);
    return [];
  }
}

// Fetch related podcasts by genre (excluding the current podcast)
export async function fetchRelatedPodcastsByGenre(currentPodcastId, genres, limit = 6) {
  try {
    const allPodcasts = await fetchAllPodcasts();
    
    // Normalize genres to array
    const genreArray = Array.isArray(genres) 
      ? genres.filter(g => g).map(g => g.trim().toLowerCase())
      : genres 
        ? [genres.trim().toLowerCase()]
        : [];
    
    if (genreArray.length === 0) return [];
    
    // Find podcasts with matching genres (excluding current podcast and private ones)
    const related = allPodcasts
      .filter(p => {
        if (p.id === currentPodcastId || p.is_private) return false;
        
        const pGenres = Array.isArray(p.genre)
          ? p.genre.filter(g => g).map(g => g.trim().toLowerCase())
          : p.genre
            ? [p.genre.trim().toLowerCase()]
            : [];
        
        // Check if any genre matches
        return pGenres.some(g => genreArray.includes(g));
      })
      .slice(0, limit);
    
    return related;
  } catch (error) {
    console.error('Error fetching related podcasts:', error);
    return [];
  }
}

// Fetch podcasts by genre for genre pages
export async function fetchPodcastsByGenre(genre, limit = 100) {
  try {
    const allPodcasts = await fetchAllPodcasts();
    const genreLower = genre.trim().toLowerCase();
    
    const matching = allPodcasts
      .filter(p => {
        if (p.is_private) return false;
        
        const pGenres = Array.isArray(p.genre)
          ? p.genre.filter(g => g).map(g => g.trim().toLowerCase())
          : p.genre
            ? [p.genre.trim().toLowerCase()]
            : [];
        
        return pGenres.includes(genreLower);
      })
      .slice(0, limit);
    
    return matching;
  } catch (error) {
    console.error('Error fetching podcasts by genre:', error);
    return [];
  }
}

// Get all unique genres from podcasts
export async function fetchAllGenres() {
  try {
    const podcasts = await fetchAllPodcasts();
    const genreSet = new Set();
    
    podcasts
      .filter(p => !p.is_private)
      .forEach(p => {
        if (Array.isArray(p.genre)) {
          p.genre.filter(g => g).forEach(g => genreSet.add(g.trim()));
        } else if (p.genre) {
          genreSet.add(p.genre.trim());
        }
      });
    
    return Array.from(genreSet).sort();
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

