import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Podcast Library</title>
        <meta name="description" content="Privacy Policy for Podcast Library" />
      </Head>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: '1.6' }}>
        <h1>Privacy Policy</h1>
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2>1. Information We Collect</h2>
        
        <h3>Account Information</h3>
        <p>
          If you choose to create an account, we collect your email address and a password (which is securely hashed and never stored in plain text). This information is used solely for authentication and account management.
        </p>

        <h3>Usage Data</h3>
        <p>
          When you use the Service, we may collect:
        </p>
        <ul>
          <li><strong>Listening History:</strong> Episodes you have played, including timestamps</li>
          <li><strong>Favorites:</strong> Podcasts, episodes, and authors you mark as favorites</li>
          <li><strong>Playback Progress:</strong> Your position in episodes you are listening to</li>
          <li><strong>Preferences:</strong> Your sorting and display preferences</li>
        </ul>
        <p>
          This data is stored locally in your browser and, if you have an account, synced to our secure servers to enable cross-device access.
        </p>

        <h3>Technical Information</h3>
        <p>
          We may collect technical information such as your IP address, browser type, device type, and usage patterns. This information is used to improve the Service and ensure security.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and maintain the Service</li>
          <li>Enable cross-device synchronization of your data</li>
          <li>Improve and optimize the Service</li>
          <li>Ensure the security and integrity of the Service</li>
          <li>Respond to your inquiries and provide support</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>
          Your data is stored securely using industry-standard security measures:
        </p>
        <ul>
          <li>All data is encrypted in transit using HTTPS</li>
          <li>User authentication is handled by Supabase, a secure authentication provider</li>
          <li>User data is stored in a secure database with row-level security policies</li>
          <li>Only you can access your own data through authenticated API requests</li>
        </ul>
        <p>
          We use Supabase for authentication and data storage, which complies with industry security standards including SOC 2 Type II.
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
        </p>
        <ul>
          <li><strong>Service Providers:</strong> We use Supabase to provide authentication and database services. They have access to your data only as necessary to provide these services.</li>
          <li><strong>Legal Requirements:</strong> We may disclose your information if required by law or in response to valid requests by public authorities.</li>
        </ul>

        <h2>5. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request access to your personal data</li>
          <li><strong>Correction:</strong> Correct inaccurate or incomplete data</li>
          <li><strong>Deletion:</strong> Delete your account and all associated data</li>
          <li><strong>Opt-out:</strong> Use the Service without creating an account (data stored locally only)</li>
        </ul>
        <p>
          To exercise these rights, you can delete your account through the Service or contact us.
        </p>

        <h2>6. Cookies and Local Storage</h2>
        <p>
          We use browser local storage to store your preferences and data locally. This allows the Service to function without requiring an account. If you create an account, this data is also synced to our servers.
        </p>
        <p>
          We do not use tracking cookies or third-party analytics that track you across websites.
        </p>

        <h2>7. Children's Privacy</h2>
        <p>
          The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us to have that information removed.
        </p>

        <h2>8. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal data within a reasonable timeframe, except where we are required to retain it for legal purposes.
        </p>

        <h2>9. International Data Transfers</h2>
        <p>
          Your data may be stored and processed in servers located outside your country of residence. By using the Service, you consent to the transfer of your data to these servers.
        </p>

        <h2>10. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service after such modifications constitutes acceptance of the updated policy.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data practices, please contact us through the Service.
        </p>

        <p style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
          <a href="/web/" style={{ color: '#0066cc' }}>← Back to Podcast Library</a>
        </p>
      </div>
    </>
  );
}

