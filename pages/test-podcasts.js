// Test page to verify Supabase connection
import { fetchAllPodcasts, generateSlug } from '../lib/supabase';

export default function TestPodcasts({ podcasts, error }) {
  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Error</h1>
        <pre>{error}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Test Podcasts</h1>
      <p>Found {podcasts.length} podcasts</p>
      <ul>
        {podcasts.slice(0, 10).map(podcast => {
          const slug = generateSlug(podcast.title || '');
          return (
            <li key={podcast.id}>
              <strong>{podcast.title}</strong>
              <br />
              Slug: <code>{slug}</code>
              <br />
              <a href={`/podcast/${slug}`}>Test Link →</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const podcasts = await fetchAllPodcasts();
    return {
      props: {
        podcasts: podcasts || [],
        error: null
      }
    };
  } catch (error) {
    return {
      props: {
        podcasts: [],
        error: error.message
      }
    };
  }
}

