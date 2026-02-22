// Root page: only used if beforeFiles rewrite didn't run (e.g. client nav). Full-page redirect to / so rewrite serves SPA and URL stays /.
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.replace('/');
  }, []);

  return null;
}

