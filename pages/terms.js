import Head from 'next/head';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service - Podcast Library</title>
        <meta name="description" content="Terms of Service for Podcast Library" />
      </Head>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: '1.6' }}>
        <h1>Terms of Service</h1>
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Podcast Library ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Podcast Library is a web-based platform that allows users to browse, search, and listen to podcast content. The Service aggregates podcast feeds and provides a user interface for accessing podcast episodes.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You may optionally create an account to sync your listening history, favorites, and preferences across devices. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </p>

        <h2>4. User Data and Privacy</h2>
        <p>
          When you create an account, we store your listening history, favorites, and preferences to enable cross-device synchronization. This data is stored securely and is only accessible by you. Please review our Privacy Policy for more information about how we handle your data.
        </p>

        <h2>5. Content and Intellectual Property</h2>
        <p>
          All podcast content, including episodes, descriptions, and artwork, is owned by the respective podcast creators and publishers. Podcast Library does not claim ownership of any podcast content. We aggregate publicly available RSS feeds for your convenience.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose or in violation of any laws</li>
          <li>Attempt to gain unauthorized access to the Service or its related systems</li>
          <li>Interfere with or disrupt the Service or servers connected to the Service</li>
          <li>Use automated systems to access the Service without permission</li>
          <li>Reproduce, duplicate, copy, or exploit any portion of the Service without express written permission</li>
        </ul>

        <h2>7. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Podcast Library shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms of Service at any time. We will notify users of any material changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service after such modifications constitutes acceptance of the updated terms.
        </p>

        <h2>10. Termination</h2>
        <p>
          We reserve the right to terminate or suspend your account and access to the Service at our sole discretion, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
        </p>

        <h2>11. Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us through the Service.
        </p>

        <p style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
          <a href="/web/" style={{ color: '#0066cc' }}>← Back to Podcast Library</a>
        </p>
      </div>
    </>
  );
}

