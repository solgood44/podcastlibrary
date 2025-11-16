// Supabase Configuration
// Replace these values with your actual Supabase credentials
// Get them from: https://supabase.com/dashboard → Your Project → Settings → API

const SUPABASE_CONFIG = {
  // Your Supabase project URL (e.g., https://abcdefghijklmnop.supabase.co)
  url: 'https://wraezzmgoiubkjkgapwm.supabase.co',
  
  // Your Supabase anon/public key (the long string starting with eyJ...)
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYWV6em1nb2l1Ymtqa2dhcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzQzODIsImV4cCI6MjA3NzY1MDM4Mn0.PJdZy1hOiVVdgQQT-pMeaXDdDTJPIufN9_Zegtcxiwo'
};

// EMERGENCY EGRESS HALT MODE
// Set to true to completely halt all egress from Supabase
// This will:
// - Disable audio prefetching
// - Replace all Supabase Storage images with placeholders
// - Disable fetchAllEpisodes (large data loads)
// - Use generated author images only (no storage)
const EMERGENCY_EGRESS_HALT = true; // SET TO true TO HALT EGRESS IMMEDIATELY

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
}

