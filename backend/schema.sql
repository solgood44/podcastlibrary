-- PODCASTS
create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  feed_url text not null unique,
  title text,
  author text,
  image_url text,
  description text,
  genre text,
  is_private boolean not null default false,
  etag text,
  last_modified text,
  last_refreshed timestamptz default now()
);

-- EPISODES
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  guid text,
  title text,
  description text,
  audio_url text,
  pub_date timestamptz,
  duration_seconds int,
  image_url text,
  transcript text
);

create index if not exists idx_episodes_podcast_pub on public.episodes (podcast_id, pub_date desc);
create unique index if not exists uniq_episode_guid_per_podcast on public.episodes (podcast_id, guid);

