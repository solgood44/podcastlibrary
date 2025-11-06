import '../web/styles.css';
import './styles.css';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9CDHCMHT8J"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9CDHCMHT8J');
        `}
      </Script>
      <SpeedInsights />
      <Component {...pageProps} />
    </>
  );
}

