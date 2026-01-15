-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create events table
create table events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  event_type text check (event_type in ('conflict', 'protest', 'civil_unrest', 'armed_clash', 'demonstration', 'other')),
  severity text check (severity in ('red', 'yellow', 'green')),
  country text,
  admin1 text,
  city text,
  latitude float not null,
  longitude float not null,
  source_url text[],
  source_name text[],
  occurred_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  dedup_hash text unique
);

-- Create index on dedup_hash for faster lookups
create index idx_events_dedup_hash on events(dedup_hash);

-- Create index on occurred_at for timeline queries
create index idx_events_occurred_at on events(occurred_at desc);

-- Enable Row Level Security (RLS)
alter table events enable row level security;

-- Policy: Allow public read access
create policy "Allow public read access"
  on events for select
  using (true);

-- Policy: Allow authenticated insert/update (service role)
create policy "Allow service role insert/update"
  on events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
