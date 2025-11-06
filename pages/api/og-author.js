// API route to generate Open Graph images for authors
// Returns an SVG image with the author's name

export default function handler(req, res) {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: 'Author name is required' });
  }

  // Decode the author name
  const authorName = decodeURIComponent(name);
  
  // Get first letter for avatar-style display
  const firstLetter = authorName.charAt(0).toUpperCase();
  
  // Generate a color based on the author name (deterministic)
  const hash = authorName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Generate colors from hash
  const hue = Math.abs(hash) % 360;
  const bgColor = `hsl(${hue}, 70%, 45%)`;
  const bgColorLight = `hsl(${hue}, 70%, 55%)`;

  // Create SVG image (1200x630 for OG image standard)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${bgColorLight};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#grad)"/>
  
  <!-- Circle with first letter -->
  <circle cx="600" cy="200" r="120" fill="rgba(255, 255, 255, 0.2)"/>
  <text x="600" y="240" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${firstLetter}</text>
  
  <!-- Author name -->
  <text x="600" y="400" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(authorName)}</text>
  
  <!-- Subtitle -->
  <text x="600" y="460" font-family="Arial, sans-serif" font-size="36" fill="rgba(255, 255, 255, 0.9)" text-anchor="middle">Podcast Author</text>
  
  <!-- Podcast Library branding -->
  <text x="600" y="580" font-family="Arial, sans-serif" font-size="28" fill="rgba(255, 255, 255, 0.8)" text-anchor="middle">podcastlibrary.org</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.send(svg);
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

