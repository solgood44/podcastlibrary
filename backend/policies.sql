-- Enable RLS; allow anonymous read (no writes) for MVP app usage via anon key.
alter table public.podcasts enable row level security;
alter table public.episodes enable row level security;

-- Read-only for all (public anon) — fine for public metadata.
create policy "podcasts_read_all" on public.podcasts
  for select using (true);

create policy "episodes_read_all" on public.episodes
  for select using (true);

-- (Optional, when adding auth later, you can tighten these policies.)

-- User data policies are defined in user_data_schema.sql

