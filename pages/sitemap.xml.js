// Dynamic sitemap generation for SEO
import { fetchAllPodcasts, generateSlug } from '../lib/supabase';

function generateSiteMap(podcasts) {
  const baseUrl = 'https://podcastlibrary.org';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${baseUrl}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     ${podcasts
       .map(podcast => {
         const slug = generateSlug(podcast.title || '');
         return `
       <url>
           <loc>${baseUrl}/podcast/${slug}</loc>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
           <lastmod>${podcast.last_refreshed || new Date().toISOString()}</lastmod>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
  // Fetch podcasts
  const podcasts = await fetchAllPodcasts();

  // Generate the XML sitemap with the podcast data
  const sitemap = generateSiteMap(podcasts);

  res.setHeader('Content-Type', 'text/xml');
  // Cache sitemap for 24 hours
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default SiteMap;

