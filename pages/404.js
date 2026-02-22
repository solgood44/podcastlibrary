import Head from 'next/head';
import Link from 'next/link';

const LIBRARY_URL = '/web/';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | Podcast Library</title>
        <meta name="robots" content="noindex" />
        <style>{`
          .btn-404:hover { background: #1ed760 !important; transform: scale(1.02); }
        `}</style>
      </Head>
      <div style={styles.container}>
        <div style={styles.content}>
          <span style={styles.emoji} aria-hidden>🎧</span>
          <h1 style={styles.title}>404</h1>
          <p style={styles.subtitle}>
            This page doesn’t exist — looks like you wandered off the playlist.
          </p>
          <p style={styles.hint}>
            No worries! Hit the button below and we’ll get you back to the good stuff.
          </p>
          <Link href={LIBRARY_URL} className="btn-404" style={styles.button}>
            Explore our library
          </Link>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    textAlign: 'center',
    maxWidth: '420px',
  },
  emoji: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
    lineHeight: 1,
  },
  title: {
    fontSize: '72px',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 8px 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  hint: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 28px 0',
    lineHeight: 1.5,
  },
  button: {
    display: 'inline-block',
    padding: '14px 28px',
    background: '#1db954',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: '24px',
    transition: 'background 0.2s, transform 0.15s',
  },
};
