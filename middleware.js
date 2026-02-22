import { NextResponse } from 'next/server';

const RESERVED_PATHS = new Set(['web', 'terms', 'privacy', 'api', '_next', 'favicon.ico', 'og-image-default.jpg', 'podcast', 'author', 'genre']);

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent.toLowerCase());

  // Single segment (e.g. /julius-caesar) → treat as podcast slug so pasting slug in address bar works
  const singleSegment = pathname.match(/^\/([^/]+)\/?$/);
  if (singleSegment && !RESERVED_PATHS.has(singleSegment[1].toLowerCase()) && !pathname.startsWith('/podcast/')) {
    const slug = singleSegment[1];
    const redirectUrl = new URL(`/podcast/${slug}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // For podcast/author/genre: bots get Next.js SEO page; users get SPA via rewrite so URL stays (refresh works)
  if (pathname.startsWith('/podcast/') || pathname.startsWith('/author/') || pathname.startsWith('/genre/')) {
    if (!isBot) {
      return NextResponse.rewrite(new URL('/web/index.html', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/podcast/:path*', '/author/:path*', '/genre/:path*', '/:slug'],
};

