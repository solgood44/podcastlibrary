import { useEffect } from 'react';
import Head from 'next/head';

export default function Custom404() {
  // Run redirect immediately before React renders (no flash)
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.startsWith('/podcast/')) {
      // Store the original path before redirecting
      sessionStorage.setItem('pendingRoute', path);
      // Redirect immediately to SPA - happens synchronously before render
      window.location.replace('/web/');
    }
  }

  useEffect(() => {
    // Double-check in case the redirect above didn't work
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/podcast/')) {
        sessionStorage.setItem('pendingRoute', path);
        window.location.replace('/web/');
      }
    }
  }, []);

  // Don't render anything for podcast routes - just redirect
  if (typeof window !== 'undefined') {
    const path = window.location?.pathname;
    if (path?.startsWith('/podcast/')) {
      return (
        <>
          <Head>
            <title>Redirecting...</title>
            <meta httpEquiv="refresh" content={`0;url=/web/`} />
          </Head>
          <script dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var path = window.location.pathname;
                if (path.startsWith('/podcast/')) {
                  sessionStorage.setItem('pendingRoute', path);
                  window.location.replace('/web/');
                }
              })();
            `
          }} />
        </>
      );
    }
  }

  return (
    <>
      <Head>
        <title>404 - Page Not Found | Podcast Library</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/web/" style={{ color: '#1db954', textDecoration: 'none' }}>
          ← Back to Podcast Library
        </a>
      </div>
    </>
  );
}

