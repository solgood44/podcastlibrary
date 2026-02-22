const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirects: /web and /web/ must serve the SPA (public/web/index.html)
  async redirects() {
    return [
      { source: '/web', destination: '/web/index.html', permanent: false },
      { source: '/web/', destination: '/web/index.html', permanent: false },
    ];
  },
  // Rewrites: serve SPA for app routes. Use beforeFiles so these run before page routes,
  // otherwise / would be handled by pages/index.js instead of serving the SPA.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/web/:path*',
          destination: '/web/:path*',
        },
        {
          source: '/recent',
          destination: '/web/index.html',
        },
        {
          source: '/favorites',
          destination: '/web/index.html',
        },
        {
          source: '/authors',
          destination: '/web/index.html',
        },
        {
          source: '/search',
          destination: '/web/index.html',
        },
        {
          source: '/category/:path*',
          destination: '/web/index.html',
        },
        {
          source: '/',
          destination: '/web/index.html',
        },
      ],
    };
  },
  
  // Output configuration
  output: 'standalone',
  
  // Image optimization configuration
  // Currently unoptimized due to images from various external sources (Supabase, podcast feeds)
  // To enable optimization:
  // 1. Set unoptimized: false
  // 2. Add remotePatterns for Supabase Storage and common podcast CDNs
  // 3. Consider using a CDN proxy for external images
  images: {
    // Allow images from Supabase Storage and your domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'podcastlibrary.org',
        pathname: '/**',
      },
    ],
    // Keep unoptimized for now to avoid breaking external image URLs
    // Enable when ready to optimize: set to false and test thoroughly
    unoptimized: true,
    // Image formats to use when optimization is enabled
    formats: ['image/webp', 'image/avif'],
  },
  
  // Trailing slash for consistency
  trailingSlash: false,
};

module.exports = nextConfig;

