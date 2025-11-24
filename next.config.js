const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrites for dev mode (Vercel uses vercel.json in production)
  async rewrites() {
    return [
      // Serve SPA from /web directory
      {
        source: '/web/:path*',
        destination: '/web/:path*',
      },
      // Root redirects to web
      {
        source: '/',
        destination: '/web/',
      },
    ];
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

