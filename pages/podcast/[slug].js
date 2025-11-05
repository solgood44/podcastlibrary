import { fetchPodcastBySlug, fetchEpisodesByPodcastId, generateSlug } from '../../lib/supabase';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PodcastPage({ podcast, episodes, error }) {
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

  // Format description for display
  const description = podcast.description 
    ? podcast.description.replace(/<[^>]*>/g, '').substring(0, 300) 
    : `Listen to ${podcast.title} on Podcast Library.`;

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
        <meta name="description" content={description} />
        <meta name="keywords" content={`${podcast.title}, ${genres}, podcast, episodes`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`} />
        <meta property="og:title" content={`${podcast.title} | Podcast Library`} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`} />
        <meta property="twitter:title" content={`${podcast.title} | Podcast Library`} />
        <meta property="twitter:description" content={description} />
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
              description: description,
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
                  audio: ep.audio_url ? {
                    '@type': 'AudioObject',
                    contentUrl: ep.audio_url
                  } : undefined
                }))
              })
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
              alt={podcast.title}
              className="podcast-seo-artwork"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          
          <div className="podcast-seo-info">
            <h1 className="podcast-seo-title">{podcast.title}</h1>
            
            {podcast.author && (
              <p className="podcast-seo-author">
                By {podcast.author}
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
        {podcast.description && (
          <div 
            className="podcast-seo-description"
            dangerouslySetInnerHTML={{ 
              __html: podcast.description.replace(/\n/g, '<br>') 
            }}
          />
        )}

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

    // Generate paths for all podcasts
    const paths = podcasts.map(podcast => ({
      params: { slug: generateSlug(podcast.title || '') }
    }));

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
    const { fetchPodcastBySlug, fetchEpisodesByPodcastId } = await import('../../lib/supabase');
    const podcast = await fetchPodcastBySlug(params.slug);

    console.log('Found podcast:', podcast ? podcast.title : 'NOT FOUND');

    if (!podcast) {
      console.log('Returning 404 for slug:', params.slug);
      return {
        notFound: true
      };
    }

    // Fetch recent episodes (limit to 50 for performance)
    const episodes = await fetchEpisodesByPodcastId(podcast.id);

    return {
      props: {
        podcast,
        episodes: episodes || []
      },
      // Revalidate every hour (3600 seconds)
      // This means pages will be regenerated at most once per hour
      revalidate: 3600
    };
  } catch (error) {
    console.error('Error fetching podcast data:', error);
    return {
      props: {
        error: 'Failed to load podcast',
        podcast: null,
        episodes: []
      }
    };
  }
}

