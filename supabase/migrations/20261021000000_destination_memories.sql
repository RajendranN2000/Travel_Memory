-- Public memories for a destination page, with their average rating.
-- Only public memories are listed; unlisted and private ones never appear.

create or replace function public.list_destination_memories(p_destination text, p_limit integer default 12)
returns table (
  slug text,
  title text,
  description text,
  template_slug text,
  cover_path text,
  published_at timestamptz,
  avg_rating numeric,
  review_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pm.slug,
    pm.content ->> 'title',
    pm.content ->> 'description',
    pm.content ->> 'templateSlug',
    pm.photo_paths[1],
    pm.published_at,
    coalesce(round(avg(r.rating), 1), 0),
    count(r.id)
  from public.published_memories pm
  left join public.memory_reviews r on r.memory_id = pm.id
  where pm.visibility = 'public'
    and pm.content ->> 'destinationSlug' = p_destination
  group by pm.id
  order by count(r.id) filter (where r.rating >= 4) desc, pm.published_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 24);
$$;

revoke all on function public.list_destination_memories(text, integer) from public;
grant execute on function public.list_destination_memories(text, integer) to anon, authenticated;
