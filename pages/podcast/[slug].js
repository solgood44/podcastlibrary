import { fetchPodcastBySlug, fetchEpisodesByPodcastId, generateSlug } from '../../lib/supabase';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PodcastPage({ podcast, episodes, relatedPodcasts, error }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect real users to SPA (keep SEO page for bots)
    // Check if it's a bot/crawler by looking at user agent
    if (typeof window !== 'undefined' && podcast && !error) {
      const userAgent = navigator.userAgent.toLowerCase();
      const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
      
      // Only redirect if it's NOT a bot
      if (!isBot) {
        // Redirect to SPA version, preserving the URL
        const slug = generateSlug(podcast.title || '');
        if (slug) {
          // Store the path in sessionStorage so SPA can route correctly
          sessionStorage.setItem('pendingRoute', `/podcast/${slug}`);
          window.location.replace(`/web/`);
        }
      }
    }
  }, [podcast, error, router]);

  if (error || !podcast) {
    return (
      <>
        <Head>
          <title>Podcast Not Found | Podcast Library</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="podcast-seo-not-found">
          <h1>Podcast Not Found</h1>
          <p>The podcast you're looking for doesn't exist.</p>
          <a href="/web/" className="podcast-seo-back-link">← Back to Podcast Library</a>
        </div>
      </>
    );
  }

  // Format description for SEO (150-160 chars optimal for search results)
  const rawDescription = podcast.description 
    ? podcast.description.replace(/<[^>]*>/g, '').trim()
    : '';
  
  // Create SEO-optimized description (150-160 chars for meta, 300 for display)
  const seoDescription = rawDescription
    ? (rawDescription.length > 160 
        ? rawDescription.substring(0, 157) + '...' 
        : rawDescription)
    : `Listen to ${podcast.title} - Browse episodes and stream on Podcast Library.`;
  
  // Full description for page display (up to 300 chars)
  const displayDescription = rawDescription
    ? rawDescription.substring(0, 300)
    : seoDescription;

  // Get genres
  const genres = Array.isArray(podcast.genre) 
    ? podcast.genre.filter(g => g).join(', ') 
    : podcast.genre || 'Podcast';

  // Episode count
  const episodeCount = episodes.length;

  // Open Graph image
  const ogImage = podcast.image_url || '/og-image-default.jpg';

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{podcast.title} | Podcast Library</title>
        <meta name="title" content={`${podcast.title} | Podcast Library`} />
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={`${podcast.title}, ${genres}, podcast, episodes`} />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`} />
        <meta property="og:title" content={`${podcast.title} | Podcast Library`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={ogImage} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`} />
        <meta property="twitter:title" content={`${podcast.title} | Podcast Library`} />
        <meta property="twitter:description" content={seoDescription} />
        <meta property="twitter:image" content={ogImage} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`} />
        
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'PodcastSeries',
              name: podcast.title,
              description: displayDescription,
              url: `https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`,
              image: podcast.image_url,
              genre: genres,
              author: podcast.author ? {
                '@type': 'Person',
                name: podcast.author
              } : undefined,
              numberOfEpisodes: episodeCount,
              ...(episodes.length > 0 && {
                episode: episodes.slice(0, 10).map(ep => ({
                  '@type': 'PodcastEpisode',
                  name: ep.title || 'Untitled Episode',
                  description: ep.description ? ep.description.replace(/<[^>]*>/g, '').substring(0, 200) : undefined,
                  datePublished: ep.pub_date,
                  duration: ep.duration_seconds ? `PT${ep.duration_seconds}S` : undefined,
                  image: ep.image_url || podcast.image_url,
                  partOfSeries: {
                    '@type': 'PodcastSeries',
                    name: podcast.title,
                    url: `https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`
                  },
                  audio: ep.audio_url ? {
                    '@type': 'AudioObject',
                    contentUrl: ep.audio_url,
                    encodingFormat: 'audio/mpeg', // Most podcasts use MP3
                    duration: ep.duration_seconds ? `PT${ep.duration_seconds}S` : undefined
                  } : undefined
                }))
              })
            })
          }}
        />
        
        {/* Breadcrumbs Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://podcastlibrary.org'
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Podcasts',
                  item: 'https://podcastlibrary.org/web/'
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: podcast.title,
                  item: `https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`
                }
              ]
            })
          }}
        />
      </Head>

      <div className="podcast-seo-page">
        {/* Back to SPA link */}
        <a href="/web/" className="podcast-seo-back-link">
          ← Back to Podcast Library
        </a>

        {/* Podcast Header */}
        <div className="podcast-seo-header">
          {podcast.image_url && (
            <img 
              src={podcast.image_url} 
              alt={`${podcast.title} podcast artwork`}
              className="podcast-seo-artwork"
              loading="lazy"
              width="400"
              height="400"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          
          <div className="podcast-seo-info">
            <h1 className="podcast-seo-title">{podcast.title}</h1>
            
            {podcast.author && (
              <p className="podcast-seo-author">
                By <a href={`/author/${generateSlug(podcast.author)}`} className="podcast-seo-author-link">{podcast.author}</a>
              </p>
            )}
            
            {genres && (
              <p className="podcast-seo-genres">
                {genres}
              </p>
            )}
            
            {episodeCount > 0 && (
              <p className="podcast-seo-episode-count">
                {episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {displayDescription && (
          <div 
            className="podcast-seo-description"
            dangerouslySetInnerHTML={{ 
              __html: displayDescription.replace(/\n/g, '<br>') 
            }}
          />
        )}

        {/* Additional Content for SEO - Podcast Details */}
        <div className="podcast-seo-details">
          <div className="podcast-seo-details-grid">
            {genres && (
              <div className="podcast-seo-detail-item">
                <h3 className="podcast-seo-detail-label">Genre</h3>
                <div className="podcast-seo-detail-value">
                  {Array.isArray(genres) ? (
                    genres.filter(g => g).map((genre, idx) => (
                      <span key={idx}>
                        <a href={`/genre/${generateSlug(genre.trim())}`} className="podcast-seo-genre-link">
                          {genre.trim()}
                        </a>
                        {idx < genres.filter(g => g).length - 1 && ', '}
                      </span>
                    ))
                  ) : (
                    <a href={`/genre/${generateSlug(genres.trim())}`} className="podcast-seo-genre-link">
                      {genres}
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {episodeCount > 0 && (
              <div className="podcast-seo-detail-item">
                <h3 className="podcast-seo-detail-label">Total Episodes</h3>
                <p className="podcast-seo-detail-value">{episodeCount.toLocaleString()}</p>
              </div>
            )}
            
            {podcast.author && (
              <div className="podcast-seo-detail-item">
                <h3 className="podcast-seo-detail-label">Host</h3>
                <p className="podcast-seo-detail-value">
                  <a href={`/author/${generateSlug(podcast.author)}`} className="podcast-seo-author-link">
                    {podcast.author}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Episodes List */}
        {episodes.length > 0 && (
          <div className="podcast-seo-episodes-section">
            <h2 className="podcast-seo-episodes-title">
              Recent Episodes
            </h2>
            
            <div className="podcast-seo-episodes-list">
              {episodes.map((episode) => (
                <div key={episode.id} className="podcast-seo-episode-card">
                  <h3 className="podcast-seo-episode-title">
                    {episode.title || 'Untitled Episode'}
                  </h3>
                  
                  {episode.pub_date && (
                    <p className="podcast-seo-episode-meta">
                      {new Date(episode.pub_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  
                  {episode.duration_seconds && (
                    <p className="podcast-seo-episode-meta">
                      Duration: {Math.floor(episode.duration_seconds / 60)} minutes
                    </p>
                  )}
                  
                  {episode.description && (
                    <p className="podcast-seo-episode-description">
                      {episode.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                  )}
                  
                  {episode.audio_url && (
                    <a 
                      href={`/web/?episode=${episode.id}&podcast=${podcast.id}`}
                      className="podcast-seo-listen-btn"
                      onClick={(e) => {
                        // Preserve the podcast slug when navigating
                        const slug = generateSlug(podcast.title || '');
                        sessionStorage.setItem('pendingRoute', `/podcast/${slug}`);
                      }}
                    >
                      Listen on Podcast Library →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Podcasts Section - Internal Linking for SEO */}
        {relatedPodcasts && relatedPodcasts.length > 0 && (
          <div className="podcast-seo-related-section">
            <h2 className="podcast-seo-related-title">Similar Podcasts</h2>
            <p className="podcast-seo-related-subtitle">
              Discover more podcasts in {genres || 'this genre'}
            </p>
            <div className="podcast-seo-related-list">
              {relatedPodcasts.map((related) => (
                <div key={related.id} className="podcast-seo-related-card">
                  {related.image_url && (
                    <a href={`/podcast/${generateSlug(related.title)}`}>
                      <img 
                        src={related.image_url} 
                        alt={`${related.title} podcast artwork`}
                        className="podcast-seo-related-image"
                        loading="lazy"
                        width="150"
                        height="150"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </a>
                  )}
                  <div className="podcast-seo-related-content">
                    <h3 className="podcast-seo-related-card-title">
                      <a href={`/podcast/${generateSlug(related.title)}`}>
                        {related.title}
                      </a>
                    </h3>
                    {related.author && (
                      <p className="podcast-seo-related-author">
                        By <a href={`/author/${generateSlug(related.author)}`}>{related.author}</a>
                      </p>
                    )}
                    {related.description && (
                      <p className="podcast-seo-related-description">
                        {related.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="podcast-seo-cta">
          <h3 className="podcast-seo-cta-title">Listen to this podcast</h3>
          <p className="podcast-seo-cta-text">
            Browse and listen to all episodes on Podcast Library
          </p>
          <a 
            href={`/web/?podcast=${podcast.id}`} 
            className="podcast-seo-cta-btn"
            onClick={(e) => {
              // Preserve the podcast slug when navigating
              const slug = generateSlug(podcast.title || '');
              sessionStorage.setItem('pendingRoute', `/podcast/${slug}`);
            }}
          >
            Open Podcast Library →
          </a>
        </div>
      </div>
    </>
  );
}

// Generate static paths for all podcasts at build time
export async function getStaticPaths() {
  try {
    const { fetchAllPodcasts, generateSlug } = await import('../../lib/supabase');
    const podcasts = await fetchAllPodcasts();

    // Generate paths for all podcasts (excluding private ones)
    const paths = podcasts
      .filter(podcast => !podcast.is_private) // Exclude private podcasts
      .map(podcast => ({
        params: { slug: generateSlug(podcast.title || '') }
      }))
      .filter(path => path.params.slug); // Filter out empty slugs

    // In development, return empty paths with blocking fallback
    // This allows on-demand generation during development
    if (process.env.NODE_ENV === 'development') {
      return {
        paths: [],
        fallback: 'blocking'
      };
    }

    return {
      paths,
      // Use 'blocking' fallback so new podcasts are generated on-demand
      // This prevents build time from being too long
      fallback: 'blocking'
    };
  } catch (error) {
    console.error('Error generating static paths:', error);
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}

// Fetch podcast data for each page
export async function getStaticProps({ params }) {
  try {
    console.log('Fetching podcast with slug:', params.slug);
    const { 
      fetchPodcastBySlug, 
      fetchEpisodesByPodcastId, 
      fetchRelatedPodcastsByGenre 
    } = await import('../../lib/supabase');
    const podcast = await fetchPodcastBySlug(params.slug);

    console.log('Found podcast:', podcast ? podcast.title : 'NOT FOUND');

    if (!podcast) {
      console.log('Returning 404 for slug:', params.slug);
      return {
        notFound: true
      };
    }

    // If podcast is private, return 404 - private podcasts should not be indexed
    if (podcast.is_private) {
      console.log('Podcast is private, returning 404 for slug:', params.slug);
      return {
        notFound: true
      };
    }

    // Fetch recent episodes (limit to 50 for performance)
    const episodes = await fetchEpisodesByPodcastId(podcast.id);
    
    // Fetch related podcasts by genre for internal linking
    const genres = Array.isArray(podcast.genre) 
      ? podcast.genre.filter(g => g) 
      : podcast.genre 
        ? [podcast.genre] 
        : [];
    const relatedPodcasts = await fetchRelatedPodcastsByGenre(podcast.id, genres, 6);

    return {
      props: {
        podcast,
        episodes: episodes || [],
        relatedPodcasts: relatedPodcasts || []
      },
      // OPTIMIZED: Revalidate every 12 hours (43200 seconds)
      // Podcast content doesn't change frequently, so longer revalidation reduces DB queries
      // while still keeping content fresh enough for SEO
      revalidate: 43200
    };
  } catch (error) {
    console.error('Error fetching podcast data:', error);
    // Return notFound instead of error props to prevent indexing of error pages
    return {
      notFound: true
    };
  }
}

