-- In-app feedback and star ratings / short reviews on public memories.
--
-- Feedback: anyone (signed in or not) may submit; nobody can read it through
-- the API. Review it in the Supabase dashboard (Table Editor → feedback).
--
-- Reviews: all reads and writes go through the security-definer functions
-- below, so the table itself is closed to the API. Only public memories can be
-- reviewed, only by signed-in users who don't own them, once per user.

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('bug', 'suggestion', 'other')),
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 200),
  page text check (page is null or char_length(page) <= 300),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  status text not null default 'new' check (status in ('new', 'seen', 'done')),
  created_at timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Insert only. A signed-in user can't attribute feedback to someone else.
create policy "Anyone sends feedback" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

create table public.memory_reviews (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.published_memories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (memory_id, user_id)
);

create index memory_reviews_memory_idx on public.memory_reviews (memory_id, created_at desc);

create trigger memory_reviews_set_updated_at
  before update on public.memory_reviews
  for each row execute function public.set_updated_at();

-- No policies: the table is only reachable through the functions below.
alter table public.memory_reviews enable row level security;

-- Reviews of a public memory, newest first, with the reviewer's first name.
create or replace function public.get_memory_reviews(p_slug text)
returns table (
  rating smallint,
  comment text,
  created_at timestamptz,
  reviewer text,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.rating,
    r.comment,
    r.created_at,
    coalesce(nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''), 'Traveller') as reviewer,
    (r.user_id = auth.uid()) as is_mine
  from public.memory_reviews r
  join public.published_memories pm on pm.id = r.memory_id
  left join public.profiles p on p.id = r.user_id
  where pm.slug = p_slug
    and pm.visibility = 'public'
  order by r.created_at desc
  limit 50;
$$;

-- Adds or updates the caller's review.
create or replace function public.submit_memory_review(p_slug text, p_rating integer, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memory public.published_memories%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;

  select * into v_memory from public.published_memories where slug = p_slug and visibility = 'public';
  if not found then
    raise exception 'memory_not_found' using errcode = 'P0002';
  end if;
  if v_memory.owner_id = auth.uid() then
    raise exception 'own_memory' using errcode = '42501';
  end if;

  insert into public.memory_reviews (memory_id, user_id, rating, comment)
  values (v_memory.id, auth.uid(), p_rating, left(btrim(coalesce(p_comment, '')), 500))
  on conflict (memory_id, user_id)
  do update set rating = excluded.rating, comment = excluded.comment;
end;
$$;

create or replace function public.delete_my_memory_review(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.memory_reviews r
  using public.published_memories pm
  where pm.id = r.memory_id and pm.slug = p_slug and r.user_id = auth.uid();
$$;

revoke all on function public.get_memory_reviews(text) from public;
revoke all on function public.submit_memory_review(text, integer, text) from public;
revoke all on function public.delete_my_memory_review(text) from public;
grant execute on function public.get_memory_reviews(text) to anon, authenticated;
grant execute on function public.submit_memory_review(text, integer, text) to authenticated;
grant execute on function public.delete_my_memory_review(text) to authenticated;
