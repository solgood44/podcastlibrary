import '../web/styles.css';
import './styles.css';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-9CDHCMHT8J';

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Google Analytics 4 */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              
              // Configure GA4 with enhanced settings
              gtag('config', '${GA_MEASUREMENT_ID}', {
                // Enhanced measurement
                send_page_view: true,
                
                // Privacy settings
                anonymize_ip: true,
                allow_google_signals: false, // Set to true if you want demographic data
                allow_ad_personalization_signals: false,
                
                // Custom dimensions (set these up in GA4 admin)
                custom_map: {
                  'dimension1': 'user_type', // e.g., 'guest', 'authenticated'
                  'dimension2': 'content_type', // e.g., 'podcast', 'episode', 'author'
                },
                
                // Performance optimization
                transport_type: 'beacon',
              });
            `}
          </Script>
        </>
      )}
      <SpeedInsights />
      
      {/* Organization Schema for SEO */}
      <Script
        id="organization-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Podcast Library',
            url: 'https://podcastlibrary.org',
            logo: 'https://podcastlibrary.org/og-image.svg',
            description: 'Discover and listen to thousands of podcasts from your favorite creators',
            sameAs: [] // Add social media URLs here if available
          })
        }}
      />
      
      <Component {...pageProps} />
    </>
  );
}

