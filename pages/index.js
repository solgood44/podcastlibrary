// Root page - redirect to SPA
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the SPA
    router.replace('/web/');
  }, [router]);

  return null;
}

