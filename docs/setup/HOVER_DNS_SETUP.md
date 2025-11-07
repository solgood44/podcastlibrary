# Hover DNS Setup for podcastlibarary.org

## Quick Setup Steps

1. **Get DNS records from Vercel:**
   - Click "Learn more" next to each domain in Vercel dashboard
   - Copy the exact DNS records shown

2. **Log into Hover:**
   - Go to [hover.com](https://hover.com) and log in
   - Navigate to your domain: `podcastlibarary.org`
   - Click on "DNS" or "DNS Management"

3. **Add DNS Records:**

   **For root domain (`podcastlibarary.org`):**
   - **Type:** A
   - **Name:** `@` (or leave blank)
   - **Value:** [IP from Vercel - check Vercel dashboard]
   - **TTL:** 3600 (or default)

   **For www subdomain (`www.podcastlibarary.org`):**
   - **Type:** CNAME
   - **Name:** `www`
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** 3600 (or default)

4. **Save and Wait:**
   - Save changes in Hover
   - Wait 5-15 minutes for DNS propagation
   - Click "Refresh" in Vercel dashboard
   - Status should change to "Valid Configuration" ✅

## Important Notes

- ⚠️ **Check Vercel dashboard for exact IP addresses** - they may change
- Vercel uses multiple A records for redundancy (you may see 4 IPs)
- If Vercel shows multiple IPs, add multiple A records in Hover
- DNS changes can take up to 24 hours, but usually work within minutes

## Verification

After adding records:
1. Wait 5-15 minutes
2. Go back to Vercel → Settings → Domains
3. Click "Refresh" button next to each domain
4. Status should change from "Invalid Configuration" to "Valid Configuration"

Once both domains show "Valid Configuration", your site will be live at:
- `https://podcastlibarary.org`
- `https://www.podcastlibarary.org`

