// API endpoint to get author image URL
// Returns JSON with imageUrl, or redirects for direct image access

import { fetchAuthorImageUrl } from '../../lib/supabase';

export default async function handler(req, res) {
  const { name } = req.query;
  const { format } = req.query; // 'json' or 'redirect' (default: redirect for img tags)

  if (!name) {
    const fallbackUrl = `/api/og-author?name=&size=profile`;
    if (format === 'json') {
      return res.status(200).json({ imageUrl: fallbackUrl });
    }
    return res.redirect(302, fallbackUrl);
  }

  try {
    const authorName = decodeURIComponent(name);
    
    // Try to get stored image URL from database
    const imageUrl = await fetchAuthorImageUrl(authorName);
    
    if (imageUrl) {
      if (format === 'json') {
        return res.status(200).json({ imageUrl });
      }
      // Redirect to the stored image URL
      return res.redirect(302, imageUrl);
    }
    
    // Fallback to generated image
    const fallbackUrl = `/api/og-author?name=${encodeURIComponent(authorName)}&size=profile`;
    if (format === 'json') {
      return res.status(200).json({ imageUrl: fallbackUrl });
    }
    return res.redirect(302, fallbackUrl);
    
  } catch (error) {
    console.error('Error fetching author image:', error);
    // Fallback to generated image on error
    const fallbackUrl = `/api/og-author?name=${encodeURIComponent(decodeURIComponent(name))}&size=profile`;
    if (format === 'json') {
      return res.status(200).json({ imageUrl: fallbackUrl });
    }
    return res.redirect(302, fallbackUrl);
  }
}

