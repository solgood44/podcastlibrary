-- SOUNDS TABLE
-- Stores nature sounds and ambient audio loops
create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  audio_url text not null,
  image_url text,
  duration_seconds int,
  category text, -- e.g., 'nature', 'water', 'rain', 'wind', etc.
  is_premium boolean not null default false, -- For future payment integration
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sounds_category on public.sounds (category);
create index if not exists idx_sounds_title on public.sounds (title);

-- Enable RLS (Row Level Security)
alter table public.sounds enable row level security;

-- Policy: Allow public read access to sounds
-- For premium sounds, you can add additional checks later
create policy "Allow public read access to sounds"
  on public.sounds
  for select
  using (true);

-- For future: Add policy for premium sounds that checks user subscription
-- create policy "Allow premium sounds for subscribed users"
--   on public.sounds
--   for select
--   using (
--     is_premium = false OR 
--     (is_premium = true AND auth.uid() IN (
--       SELECT user_id FROM user_subscriptions WHERE active = true
--     ))
--   );

