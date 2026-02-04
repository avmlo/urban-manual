-- ML RANKING FUNCTION (Dot-product similarity to your curated embedding average)
create or replace function recommend_places()
returns table (
  place_id text,
  name text,
  city text,
  score float
)
language sql
stable
as $$
  with curated_mean as (
    select avg(embedding) as mean_vec 
    from destinations 
    where embedding is not null
  )
  select
    c.place_id,
    c.name,
    c.city,
    (c.embedding <#> (select mean_vec from curated_mean)) * -1 as score
  from discovery_candidates c
  where c.embedding is not null
    and exists (select 1 from curated_mean where mean_vec is not null)
  order by score desc
  limit 50;
$$;

