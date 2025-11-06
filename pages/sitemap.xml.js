// Dynamic sitemap generation for SEO
import { fetchAllPodcasts, fetchAllAuthors, generateSlug } from '../lib/supabase';

function generateSiteMap(podcasts, authors) {
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
     ${authors
       .map(author => {
         const slug = generateSlug(author || '');
         return `
       <url>
           <loc>${baseUrl}/author/${slug}</loc>
           <changefreq>weekly</changefreq>
           <priority>0.7</priority>
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
  // Fetch podcasts and authors
  const podcasts = await fetchAllPodcasts();
  const authors = await fetchAllAuthors();

  // Generate the XML sitemap with the podcast and author data
  const sitemap = generateSiteMap(podcasts, authors);

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

