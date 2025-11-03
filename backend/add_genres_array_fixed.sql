-- Migration: Change genre from single text to text array to support multiple genres
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)

-- Step 1: Clean up if already text[] array
-- (This will only run if column is text[], will error if text - that's ok)
do $$ 
begin
    update public.podcasts 
    set genre = null 
    where genre = '{}'::text[] 
       or (array_length(genre, 1) = 0);
    raise notice 'Cleaned up empty arrays (if column was already text[])';
exception 
    when others then
        -- Column is not text[] yet, that's fine - continue
        raise notice 'Column not text[] yet, will convert...';
end $$;

-- Step 2: Convert text to text[] if needed
-- (This will only run if column is text, will error if already text[] - that's ok)
do $$
begin
    -- Handle empty strings first
    update public.podcasts 
    set genre = null 
    where genre::text = '' or genre is null;
    
    -- Convert to array
    alter table public.podcasts 
      alter column genre type text[] using 
        case 
          when genre is null or genre::text = '' then null::text[]
          else array[genre::text]::text[]
        end;
    raise notice 'Converted genre column from text to text[]';
exception 
    when duplicate_object then
        raise notice 'Column already text[]';
    when others then
        -- If column is already text[], this will error - that's fine
        if sqlstate = '42804' then
            raise notice 'Column is already text[] type';
        else
            raise;
        end if;
end $$;

-- Step 3: Create indexes (safe to run multiple times)
create index if not exists idx_podcasts_genres on public.podcasts using gin(genre);
create index if not exists idx_podcasts_last_refreshed on public.podcasts(last_refreshed);
create index if not exists idx_episodes_pub_date on public.episodes(pub_date desc);
create index if not exists idx_episodes_guid on public.episodes(guid);

