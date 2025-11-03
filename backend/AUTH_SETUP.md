# Optional Authentication Setup

This guide explains how to set up optional authentication for cross-device sync.

## Database Setup

1. Open your Supabase project → SQL Editor
2. Copy and paste the SQL below, or open the file `backend/user_data_schema.sql` and copy its contents
3. Run the SQL query

### Configure Email Redirect URLs

**IMPORTANT**: You need to configure where email confirmation links should redirect.

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Under **Site URL**, enter your app's URL:
   - For local development: `http://localhost:8000` (or whatever port you're using)
   - For production: `https://yourdomain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:8000/**` (for local dev)
   - `https://yourdomain.com/**` (for production)
   - You can add multiple URLs separated by commas

**Alternative: Disable Email Confirmation (for development/testing)**
- Go to **Authentication** → **Email Templates**
- Or go to **Authentication** → **Settings** → **Email Auth** → Toggle "Confirm email" to OFF
- This allows users to sign in immediately without email confirmation

**SQL to run:**

```sql
-- USER DATA TABLE
-- Stores user progress, history, favorites, and preferences for cross-device sync

create table if not exists public.user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress jsonb default '{}',
  history jsonb default '[]',
  favorites jsonb default '{"podcasts": [], "episodes": []}',
  sort_preferences jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_user_data_user_id on public.user_data(user_id);

-- Enable RLS
alter table public.user_data enable row level security;

-- Users can only read/write their own data
create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id);

create policy "user_data_delete_own" on public.user_data
  for delete using (auth.uid() = user_id);
```

This creates:
- `user_data` table to store user progress, history, favorites, and preferences
- Row-level security policies so users can only access their own data

## How It Works

### Default Behavior (No Login Required)
- The app works completely without authentication
- All data is stored in browser localStorage
- Zero barrier to entry

### Optional Authentication
- Users can optionally sign up/sign in via the "Sign In" button in the top bar
- When signed in:
  - Local data is uploaded to the server
  - Server data is downloaded and merged with local
  - Changes sync automatically (debounced every 2 seconds)
  - Data persists across devices and browsers

### Data Sync
- **Progress**: Episode playback positions
- **History**: Listening history
- **Favorites**: Favorite podcasts and episodes
- **Preferences**: Sort preferences per podcast

### Sync Strategy
- **On Sign In**: Uploads local data, then downloads server data (merges both)
- **On Changes**: Debounced sync (2 seconds after last change)
- **On Page Load**: Downloads server data if signed in
- **Merge Logic**: 
  - Objects: Server takes precedence for conflicts
  - Arrays: Combined with duplicates removed

## Testing

1. Use the app without signing in (should work as before)
2. Sign up with a test email
3. Add some favorites, play episodes, etc.
4. Sign in on a different device/browser
5. Data should sync across devices

## Security Notes

- Uses Supabase Auth for secure authentication
- Row-level security ensures users can only access their own data
- Passwords are never stored (handled by Supabase)
- All API calls use JWT tokens for authentication

