// Root page - redirect to SPA
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to root (SPA is served there via rewrite; avoid /web/ so refresh stays on /)
    router.replace('/');
  }, [router]);

  return null;
}

