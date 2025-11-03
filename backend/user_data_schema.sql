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

