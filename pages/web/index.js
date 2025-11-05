// Serve the SPA - redirect to actual file in dev, or serve in production
import { useEffect } from 'react';

export default function WebSPA() {
  useEffect(() => {
    // In dev mode, we need to access the actual HTML file
    // In production, Vercel serves it automatically
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Try to load the SPA directly
      window.location.href = window.location.origin + '/web/index.html';
    }
  }, []);
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
      <p>Loading your SPA...</p>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#888' }}>
        If it doesn't load, try: <a href="/web/index.html" style={{ color: '#1db954' }}>/web/index.html</a>
      </p>
    </div>
  );
}

