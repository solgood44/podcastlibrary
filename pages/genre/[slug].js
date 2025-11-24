import { fetchPodcastsByGenre, fetchAllGenres, generateSlug } from '../../lib/supabase';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function GenrePage({ genre, podcasts, error }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect real users to SPA (keep SEO page for bots)
    if (typeof window !== 'undefined' && genre && !error) {
      const userAgent = navigator.userAgent.toLowerCase();
      const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
      
      if (!isBot) {
        sessionStorage.setItem('pendingRoute', `/genre/${generateSlug(genre)}`);
        window.location.replace(`/web/`);
      }
    }
  }, [genre, error, router]);

  if (error || !genre) {
    return (
      <>
        <Head>
          <title>Genre Not Found | Podcast Library</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="podcast-seo-not-found">
          <h1>Genre Not Found</h1>
          <p>The genre you're looking for doesn't exist.</p>
          <a href="/web/" className="podcast-seo-back-link">← Back to Podcast Library</a>
        </div>
      </>
    );
  }

  const seoDescription = `Discover ${podcasts.length} ${genre} podcasts on Podcast Library. Browse and listen to episodes from top ${genre} podcast creators.`;

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{genre} Podcasts | Podcast Library</title>
        <meta name="title" content={`${genre} Podcasts | Podcast Library`} />
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={`${genre}, podcasts, episodes, ${genre} shows`} />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://podcastlibrary.org/genre/${generateSlug(genre)}`} />
        <meta property="og:title" content={`${genre} Podcasts | Podcast Library`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content="https://podcastlibrary.org/og-image.svg" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://podcastlibrary.org/genre/${generateSlug(genre)}`} />
        <meta property="twitter:title" content={`${genre} Podcasts | Podcast Library`} />
        <meta property="twitter:description" content={seoDescription} />
        <meta property="twitter:image" content="https://podcastlibrary.org/og-image.svg" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://podcastlibrary.org/genre/${generateSlug(genre)}`} />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: `${genre} Podcasts`,
              description: seoDescription,
              url: `https://podcastlibrary.org/genre/${generateSlug(genre)}`,
              about: {
                '@type': 'Thing',
                name: genre
              },
              ...(podcasts.length > 0 && {
                mainEntity: {
                  '@type': 'ItemList',
                  numberOfItems: podcasts.length,
                  itemListElement: podcasts.slice(0, 20).map((podcast, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: {
                      '@type': 'PodcastSeries',
                      name: podcast.title,
                      url: `https://podcastlibrary.org/podcast/${generateSlug(podcast.title)}`,
                      image: podcast.image_url
                    }
                  }))
                }
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
                  name: 'Genres',
                  item: 'https://podcastlibrary.org/web/'
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: genre,
                  item: `https://podcastlibrary.org/genre/${generateSlug(genre)}`
                }
              ]
            })
          }}
        />
      </Head>

      <div className="podcast-seo-page">
        <a href="/web/" className="podcast-seo-back-link">
          ← Back to Podcast Library
        </a>

        <div className="podcast-seo-header">
          <div className="podcast-seo-info">
            <h1 className="podcast-seo-title">{genre} Podcasts</h1>
            <p className="podcast-seo-episode-count">
              {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="podcast-seo-description">
          <p>Explore our collection of {genre} podcasts. Discover new shows, browse episodes, and listen to your favorite {genre.toLowerCase()} content on Podcast Library.</p>
        </div>

        {/* Podcasts List */}
        {podcasts.length > 0 ? (
          <div className="podcast-seo-episodes-section">
            <h2 className="podcast-seo-episodes-title">
              {genre} Podcasts
            </h2>
            
            <div className="podcast-seo-related-list">
              {podcasts.map((podcast) => (
                <div key={podcast.id} className="podcast-seo-related-card">
                  {podcast.image_url && (
                    <a href={`/podcast/${generateSlug(podcast.title)}`}>
                      <img 
                        src={podcast.image_url} 
                        alt={`${podcast.title} podcast artwork`}
                        className="podcast-seo-related-image"
                        loading="lazy"
                        width="200"
                        height="200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </a>
                  )}
                  
                  <div className="podcast-seo-related-content">
                    <h3 className="podcast-seo-related-card-title">
                      <a href={`/podcast/${generateSlug(podcast.title)}`}>
                        {podcast.title}
                      </a>
                    </h3>
                    
                    {podcast.author && (
                      <p className="podcast-seo-related-author">
                        By <a href={`/author/${generateSlug(podcast.author)}`}>{podcast.author}</a>
                      </p>
                    )}
                    
                    {podcast.description && (
                      <p className="podcast-seo-related-description">
                        {podcast.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                    )}
                    
                    <a 
                      href={`/web/?podcast=${podcast.id}`}
                      className="podcast-seo-listen-btn"
                      onClick={(e) => {
                        const slug = generateSlug(podcast.title || '');
                        sessionStorage.setItem('pendingRoute', `/podcast/${slug}`);
                      }}
                    >
                      View Podcast →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="podcast-seo-episodes-section">
            <p>No podcasts found in this genre.</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="podcast-seo-cta">
          <h3 className="podcast-seo-cta-title">Browse more podcasts</h3>
          <p className="podcast-seo-cta-text">
            Discover more content on Podcast Library
          </p>
          <a 
            href="/web/" 
            className="podcast-seo-cta-btn"
          >
            Open Podcast Library →
          </a>
        </div>
      </div>
    </>
  );
}

// Generate static paths for all genres
export async function getStaticPaths() {
  try {
    const { fetchAllGenres, generateSlug } = await import('../../lib/supabase');
    const genres = await fetchAllGenres();

    const paths = genres.map(genre => ({
      params: { slug: generateSlug(genre || '') }
    })).filter(path => path.params.slug);

    if (process.env.NODE_ENV === 'development') {
      return {
        paths: [],
        fallback: 'blocking'
      };
    }

    return {
      paths,
      fallback: 'blocking'
    };
  } catch (error) {
    console.error('Error generating genre paths:', error);
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}

// Fetch genre data for each page
export async function getStaticProps({ params }) {
  try {
    console.log('Fetching genre with slug:', params.slug);
    const { fetchPodcastsByGenre, fetchAllGenres, generateSlug } = await import('../../lib/supabase');
    const allGenres = await fetchAllGenres();
    
    // Find the genre that matches this slug
    const genre = allGenres.find(g => generateSlug(g) === params.slug);

    if (!genre) {
      return {
        notFound: true
      };
    }

    // Fetch podcasts in this genre
    const podcasts = await fetchPodcastsByGenre(genre, 100);

    return {
      props: {
        genre,
        podcasts: podcasts || []
      },
      revalidate: 21600 // Revalidate every 6 hours
    };
  } catch (error) {
    console.error('Error fetching genre data:', error);
    return {
      notFound: true
    };
  }
}

