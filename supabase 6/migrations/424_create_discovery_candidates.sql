-- Create table for candidate places (incoming Google results)
create table if not exists discovery_candidates (
  id bigint generated always as identity primary key,
  place_id text unique,
  name text,
  address text,
  city text,
  category text,
  image_url text,
  google_rating numeric,
  google_user_ratings_total integer,
  raw jsonb,
  embedding vector(3072),
  created_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index if not exists idx_discovery_candidates_place_id on discovery_candidates(place_id);
create index if not exists idx_discovery_candidates_city on discovery_candidates(city);
create index if not exists idx_discovery_candidates_embedding on discovery_candidates using ivfflat (embedding vector_cosine_ops) with (lists = 200) where embedding is not null;

-- Enable pgvector extension if not already enabled
create extension if not exists vector;

