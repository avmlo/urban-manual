-- Function to get primary cities from destinations
create or replace function get_primary_cities()
returns table (city text)
language sql
stable
as $$
  select distinct city
  from destinations
  where city is not null
    and city != ''
  order by city
  limit 50;
$$;

