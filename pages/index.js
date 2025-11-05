// Root page - redirect to SPA
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Redirect to the SPA
    window.location.href = '/web/';
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui'
    }}>
      <p>Loading...</p>
    </div>
  );
}

