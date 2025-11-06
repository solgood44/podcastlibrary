// robots.txt for SEO
function RobotsTxt() {
  // getServerSideProps will generate the content
}

export async function getServerSideProps({ res }) {
  const robotsTxt = `User-agent: *
Allow: /
Allow: /podcast/
Allow: /author/
Disallow: /api/
Disallow: /_next/

Sitemap: https://podcastlibrary.org/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(robotsTxt);
  res.end();

  return {
    props: {},
  };
}

export default RobotsTxt;

