-- AUTHORS
-- Table to store author information and descriptions
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_authors_name on public.authors (name);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_authors_updated_at
  before update on public.authors
  for each row
  execute function update_updated_at_column();

