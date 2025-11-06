import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent.toLowerCase());

  // For podcast routes, redirect real users to SPA, keep for bots
  if (pathname.startsWith('/podcast/')) {
    // Only redirect if NOT a bot
    if (!isBot) {
      // Redirect to SPA, preserving the path in sessionStorage via query param
      // The SPA will check this and route correctly
      const redirectUrl = new URL('/web/', request.url);
      redirectUrl.searchParams.set('_route', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // For author routes, redirect real users to SPA, keep for bots
  if (pathname.startsWith('/author/')) {
    // Only redirect if NOT a bot
    if (!isBot) {
      // Redirect to SPA, preserving the path in sessionStorage via query param
      const redirectUrl = new URL('/web/', request.url);
      redirectUrl.searchParams.set('_route', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/podcast/:path*', '/author/:path*'],
};

