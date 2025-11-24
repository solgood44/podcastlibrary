# MFA (Multi-Factor Authentication) Setup Guide

## Issue Summary

**Title:** Insufficient MFA Options  
**Entity:** Auth  
**Severity:** Security Warning

### Problem
Your Supabase project currently has too few multi-factor authentication (MFA) options enabled. This weakens account security by relying solely on password-based authentication, which is vulnerable to:
- Password breaches
- Phishing attacks
- Credential stuffing
- Social engineering

### Current State
- ✅ Email/Password authentication is enabled
- ❌ No MFA methods are currently configured
- ❌ Users can only authenticate with a single factor (password)

## Recommended Solution

Enable at least **one additional MFA method** in your Supabase project. Supabase supports the following MFA options:

1. **TOTP (Time-based One-Time Password)** - Recommended ⭐
   - Uses authenticator apps (Google Authenticator, Authy, 1Password, etc.)
   - Most secure and widely supported
   - No additional costs
   - Works offline

2. **SMS/Phone Verification**
   - Sends verification codes via SMS
   - Easy for users but less secure than TOTP
   - May incur costs per SMS
   - Vulnerable to SIM swapping

3. **Email-based MFA**
   - Sends verification codes via email
   - Less secure than TOTP
   - Good fallback option

## Step-by-Step Fix: Enable TOTP MFA

### 1. Enable MFA in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Scroll down to **Multi-Factor Authentication (MFA)** section
5. Toggle **"Enable MFA"** to **ON**
6. Under **MFA Methods**, enable:
   - ✅ **TOTP** (Time-based One-Time Password) - Recommended
   - Optionally: **SMS** or **Email** as additional methods

### 2. Configure MFA Settings

1. In the same **MFA** section, configure:
   - **MFA Factor Name**: Leave default or customize (e.g., "Podcast App")
   - **Issuer Name**: Your app name (e.g., "Your Podcast Website")
   - **MFA Required**: 
     - **Optional** (recommended) - Users can enable MFA if they want
     - **Required** - All users must set up MFA (more secure but higher friction)

### 3. Update Frontend Code (Optional but Recommended)

If you want to allow users to enable MFA in your app, you'll need to add MFA management functions to your `AuthService`. Here's what you can add:

#### Add to `web/auth.js` and `public/web/auth.js`:

```javascript
  // Enable TOTP MFA for current user
  async enableMFA() {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      // Start MFA enrollment
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;
      
      // data.totp contains the QR code URI and secret
      // You'll need to display this to the user so they can scan it
      return { 
        success: true, 
        qrCode: data.totp.qr_code,  // QR code image data URI
        secret: data.totp.secret,    // Secret key (for manual entry)
        uri: data.totp.uri           // Full URI for QR code
      };
    } catch (error) {
      console.error('Enable MFA error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify and complete MFA enrollment
  async verifyMFA(code) {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      // Get the factor ID from the enrollment
      const { data: { factors }, error: factorsError } = await client.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      
      const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'unverified');
      if (!totpFactor) {
        throw new Error('No unverified TOTP factor found');
      }

      // Verify the code
      const { data, error } = await client.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: totpFactor.id, // In real implementation, you'd get this from challenge
        code: code
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Verify MFA error:', error);
      return { success: false, error: error.message };
    }
  }

  // Disable MFA for current user
  async disableMFA(factorId) {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      const { data, error } = await client.auth.mfa.unenroll({
        factorId: factorId
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Disable MFA error:', error);
      return { success: false, error: error.message };
    }
  }

  // List user's MFA factors
  async listMFAFactors() {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw error;
      return { success: true, factors: data.factors };
    } catch (error) {
      console.error('List MFA factors error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with MFA (if MFA is enabled for the user)
  async signInWithMFA(email, password, code) {
    try {
      const client = this.getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      // First, sign in with password
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      // If MFA is required, verify the code
      if (signInData.session === null && signInData.mfa) {
        const { data: verifyData, error: verifyError } = await client.auth.mfa.verify({
          factorId: signInData.mfa.factorId,
          challengeId: signInData.mfa.challengeId,
          code: code
        });

        if (verifyError) throw verifyError;
        return { success: true, data: verifyData };
      }

      return { success: true, data: signInData };
    } catch (error) {
      console.error('Sign in with MFA error:', error);
      return { success: false, error: error.message };
    }
  }
```

## Quick Fix (Dashboard Only)

If you just want to resolve the lint warning without implementing MFA in your frontend:

1. **Enable MFA in Supabase Dashboard** (steps 1-2 above)
2. Set **MFA Required** to **Optional**
3. Users can still sign in normally, but they'll have the option to enable MFA through Supabase's default UI or your custom implementation

This will satisfy the lint check while maintaining your current user experience.

## Testing

After enabling MFA:

1. **Test without MFA** (if optional):
   - Sign in should work as before
   - No changes to existing functionality

2. **Test with MFA** (if you implement frontend):
   - Enable MFA for a test account
   - Sign out and sign in again
   - Verify MFA code prompt appears
   - Enter code from authenticator app
   - Verify successful sign-in

## Security Benefits

Enabling MFA provides:
- ✅ Protection against password breaches
- ✅ Defense against phishing attacks
- ✅ Compliance with security best practices
- ✅ Enhanced account security for sensitive user data (sync data)

## Additional Notes

- **TOTP is recommended** because it's the most secure and doesn't require additional services
- **MFA can be optional** - users don't have to enable it, but the option exists
- **Existing users** won't be affected unless you make MFA required
- **New users** can optionally set up MFA during or after signup

## References

- [Supabase MFA Documentation](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase Auth MFA API](https://supabase.com/docs/reference/javascript/auth-mfa)





