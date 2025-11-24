// Dynamic sitemap generation for SEO
import { fetchAllPodcasts, fetchAllAuthors, fetchAllGenres, generateSlug } from '../lib/supabase';

function generateSiteMap(validPodcasts, validAuthors, validGenres) {
  const baseUrl = 'https://podcastlibrary.org';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
           xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
     <url>
       <loc>${baseUrl}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     ${validPodcasts
       .map(podcast => {
         const slug = generateSlug(podcast.title || '');
         if (!slug) return ''; // Skip if no valid slug
         const imageTag = podcast.image_url 
           ? `<image:image>
           <image:loc>${podcast.image_url}</image:loc>
           <image:title>${(podcast.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
           <image:caption>${(podcast.title || '')} podcast artwork</image:caption>
         </image:image>`
           : '';
         return `
       <url>
           <loc>${baseUrl}/podcast/${slug}</loc>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
           <lastmod>${podcast.last_refreshed || new Date().toISOString()}</lastmod>
           ${imageTag}
       </url>
     `;
       })
       .filter(Boolean)
       .join('')}
     ${validAuthors
       .map(author => {
         const slug = generateSlug(author || '');
         if (!slug) return ''; // Skip if no valid slug
         return `
       <url>
           <loc>${baseUrl}/author/${slug}</loc>
           <changefreq>weekly</changefreq>
           <priority>0.7</priority>
       </url>
     `;
       })
       .filter(Boolean)
       .join('')}
     ${validGenres
       .map(genre => {
         const slug = generateSlug(genre || '');
         if (!slug) return ''; // Skip if no valid slug
         return `
       <url>
           <loc>${baseUrl}/genre/${slug}</loc>
           <changefreq>weekly</changefreq>
           <priority>0.6</priority>
       </url>
     `;
       })
       .filter(Boolean)
       .join('')}
   </urlset>
 `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
  try {
    // Fetch podcasts, authors, and genres
    const podcasts = await fetchAllPodcasts();
    const authors = await fetchAllAuthors();
    const genres = await fetchAllGenres();

    // Validate podcasts: filter out invalid ones and private podcasts
    // Create a map of slug -> podcast for quick validation
    const podcastSlugMap = new Map();
    podcasts.forEach(podcast => {
      // Skip private podcasts - they should not be indexed
      if (podcast.is_private) {
        return;
      }
      if (podcast.title) {
        const slug = generateSlug(podcast.title);
        if (slug) {
          // Store by slug, keeping only the first if duplicates exist
          if (!podcastSlugMap.has(slug)) {
            podcastSlugMap.set(slug, podcast);
          }
        }
      }
    });

    // Only include podcasts that have valid slugs, are not private, and can be found
    const validPodcasts = Array.from(podcastSlugMap.values());

    // Validate authors: ensure they exist and have podcasts
    // Since we already have all podcasts, we can validate authors more efficiently
    const validAuthors = [];
    const authorPodcastCount = new Map();
    
    // Count podcasts per author (excluding private podcasts)
    podcasts.forEach(podcast => {
      // Only count non-private podcasts for author pages
      if (podcast.author && !podcast.is_private) {
        authorPodcastCount.set(podcast.author, (authorPodcastCount.get(podcast.author) || 0) + 1);
      }
    });

    // Validate each author
    for (const author of authors) {
      if (!author) continue; // Skip empty authors
      
      const slug = generateSlug(author);
      if (!slug) continue; // Skip if slug generation fails
      
      // Verify the author has podcasts (author pages should have content)
      const podcastCount = authorPodcastCount.get(author) || 0;
      if (podcastCount > 0) {
        validAuthors.push(author);
      }
    }

    // Validate genres - only include genres with podcasts
    const genrePodcastCount = new Map();
    podcasts.forEach(podcast => {
      if (podcast.is_private) return;
      const podcastGenres = Array.isArray(podcast.genre)
        ? podcast.genre.filter(g => g)
        : podcast.genre
          ? [podcast.genre]
          : [];
      podcastGenres.forEach(g => {
        genrePodcastCount.set(g.trim(), (genrePodcastCount.get(g.trim()) || 0) + 1);
      });
    });
    
    const validGenres = genres.filter(g => {
      const count = genrePodcastCount.get(g.trim()) || 0;
      return count > 0; // Only include genres with at least one podcast
    });

    // Generate the XML sitemap with validated podcasts, authors, and genres
    const sitemap = generateSiteMap(validPodcasts, validAuthors, validGenres);

    res.setHeader('Content-Type', 'text/xml');
    // Cache sitemap for 24 hours
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return a minimal valid sitemap on error
    const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://podcastlibrary.org</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
   </urlset>
 `;
    res.setHeader('Content-Type', 'text/xml');
    res.write(minimalSitemap);
    res.end();
    return {
      props: {},
    };
  }
}

export default SiteMap;

