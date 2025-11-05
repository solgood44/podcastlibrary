// Catch-all route for SPA - redirects to actual SPA files
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function WebSPA() {
  const router = useRouter();
  
  useEffect(() => {
    // In dev mode, redirect to the actual SPA file
    // This is a workaround - in production, Vercel handles this
    if (typeof window !== 'undefined') {
      // For dev testing, you should access the SPA directly
      // But we can try to load it via iframe or redirect
      window.location.href = '/web/index.html';
    }
  }, []);
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to SPA...</p>
      <p>If this doesn't work, access directly: <a href="/web/index.html">/web/index.html</a></p>
    </div>
  );
}

