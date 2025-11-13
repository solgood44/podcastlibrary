import { fetchAuthorBySlug, fetchPodcastsByAuthor, fetchAuthorDescription, generateSlug } from '../../lib/supabase';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthorPage({ authorName, podcasts, description, error }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect real users to SPA (keep SEO page for bots)
    // Check if it's a bot/crawler by looking at user agent
    if (typeof window !== 'undefined' && authorName && !error) {
      const userAgent = navigator.userAgent.toLowerCase();
      const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
      
      // Only redirect if it's NOT a bot
      if (!isBot) {
        // Redirect to SPA version, preserving the URL
        const slug = generateSlug(authorName || '');
        if (slug) {
          // Store the path in sessionStorage so SPA can route correctly
          sessionStorage.setItem('pendingRoute', `/author/${slug}`);
          window.location.replace(`/web/`);
        }
      }
    }
  }, [authorName, error, router]);

  if (error || !authorName) {
    return (
      <>
        <Head>
          <title>Author Not Found | Podcast Library</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="podcast-seo-not-found">
          <h1>Author Not Found</h1>
          <p>The author you're looking for doesn't exist.</p>
          <a href="/web/" className="podcast-seo-back-link">← Back to Podcast Library</a>
        </div>
      </>
    );
  }

  // Format description for display
  const authorDescription = description 
    ? description.replace(/<[^>]*>/g, '').substring(0, 300) 
    : `Explore podcasts by ${authorName} on Podcast Library.`;

  // Use generated OG image
  const ogImage = `https://podcastlibrary.org/api/og-author?name=${encodeURIComponent(authorName)}`;

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{authorName} - Author | Podcast Library</title>
        <meta name="title" content={`${authorName} - Author | Podcast Library`} />
        <meta name="description" content={authorDescription} />
        <meta name="keywords" content={`${authorName}, author, podcasts, episodes`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://podcastlibrary.org/author/${generateSlug(authorName)}`} />
        <meta property="og:title" content={`${authorName} - Author | Podcast Library`} />
        <meta property="og:description" content={authorDescription} />
        <meta property="og:image" content={ogImage} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://podcastlibrary.org/author/${generateSlug(authorName)}`} />
        <meta property="twitter:title" content={`${authorName} - Author | Podcast Library`} />
        <meta property="twitter:description" content={authorDescription} />
        <meta property="twitter:image" content={ogImage} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://podcastlibrary.org/author/${generateSlug(authorName)}`} />
        
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: authorName,
              description: authorDescription,
              url: `https://podcastlibrary.org/author/${generateSlug(authorName)}`,
              ...(podcasts.length > 0 && {
                knowsAbout: podcasts.map(p => ({
                  '@type': 'PodcastSeries',
                  name: p.title,
                  url: `https://podcastlibrary.org/podcast/${generateSlug(p.title)}`
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

        {/* Author Header */}
        <div className="podcast-seo-header">
          <div className="podcast-seo-info">
            <h1 className="podcast-seo-title">{authorName}</h1>
            
            {podcasts.length > 0 && (
              <p className="podcast-seo-episode-count">
                {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div 
            className="podcast-seo-description"
            dangerouslySetInnerHTML={{ 
              __html: description.replace(/\n/g, '<br>') 
            }}
          />
        )}

        {/* Podcasts List */}
        {podcasts.length > 0 ? (
          <div className="podcast-seo-episodes-section">
            <h2 className="podcast-seo-episodes-title">
              Podcasts by {authorName}
            </h2>
            
            <div className="podcast-seo-episodes-list">
              {podcasts.map((podcast) => (
                <div key={podcast.id} className="podcast-seo-episode-card">
                  {podcast.image_url && (
                    <img 
                      src={podcast.image_url} 
                      alt={podcast.title}
                      className="podcast-seo-episode-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  
                  <div className="podcast-seo-episode-content">
                    <h3 className="podcast-seo-episode-title">
                      <a href={`/podcast/${generateSlug(podcast.title)}`}>
                        {podcast.title}
                      </a>
                    </h3>
                    
                    {podcast.description && (
                      <p className="podcast-seo-episode-description">
                        {podcast.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                      </p>
                    )}
                    
                    {podcast.genre && (
                      <p className="podcast-seo-episode-meta">
                        {Array.isArray(podcast.genre) 
                          ? podcast.genre.filter(g => g).join(', ') 
                          : podcast.genre}
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
            <p>No podcasts found for this author.</p>
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

// Generate static paths for all authors at build time
export async function getStaticPaths() {
  try {
    const { fetchAllAuthors, generateSlug } = await import('../../lib/supabase');
    const authors = await fetchAllAuthors();

    // Generate paths for all authors
    const paths = authors.map(author => ({
      params: { slug: generateSlug(author || '') }
    }));

    // In development, return empty paths with blocking fallback
    if (process.env.NODE_ENV === 'development') {
      return {
        paths: [],
        fallback: 'blocking'
      };
    }

    return {
      paths,
      // Use 'blocking' fallback so new authors are generated on-demand
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

// Fetch author data for each page
export async function getStaticProps({ params }) {
  try {
    console.log('Fetching author with slug:', params.slug);
    const { fetchAuthorBySlug, fetchPodcastsByAuthor, fetchAuthorDescription } = await import('../../lib/supabase');
    const authorName = await fetchAuthorBySlug(params.slug);

    console.log('Found author:', authorName || 'NOT FOUND');

    if (!authorName) {
      console.log('Returning 404 for slug:', params.slug);
      return {
        notFound: true
      };
    }

    // Fetch podcasts by this author
    const podcasts = await fetchPodcastsByAuthor(authorName);
    
    // Fetch author description
    const description = await fetchAuthorDescription(authorName);

    return {
      props: {
        authorName,
        podcasts: podcasts || [],
        description: description || null
      },
      // Revalidate every hour (3600 seconds)
      revalidate: 3600
    };
  } catch (error) {
    console.error('Error fetching author data:', error);
    return {
      props: {
        error: 'Failed to load author',
        authorName: null,
        podcasts: [],
        description: null
      }
    };
  }
}

