import { useEffect } from 'react';
import Head from 'next/head';

export default function Custom404() {
  useEffect(() => {
    // For podcast routes that Next.js couldn't generate, redirect to SPA
    // Preserve the path in sessionStorage so the SPA can handle it
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/podcast/')) {
        // Store the original path before redirecting
        sessionStorage.setItem('pendingRoute', path);
        // Redirect to SPA - it will check sessionStorage for the route
        window.location.replace('/web/');
      }
    }
  }, []);

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
        <p>Redirecting to Podcast Library...</p>
      </div>
    </>
  );
}

