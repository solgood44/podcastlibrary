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
  
  // Optimize images
  images: {
    domains: [],
    unoptimized: true,
  },
  
  // Trailing slash for consistency
  trailingSlash: false,
};

module.exports = nextConfig;

