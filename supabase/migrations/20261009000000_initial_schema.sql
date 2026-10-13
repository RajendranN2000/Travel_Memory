-- My Travel Memory: initial schema
-- Tables, constraints, Row Level Security, storage bucket and policies.
--
-- Ownership model
--   * Every user-owned row carries owner_id = auth.users.id.
--   * Users may only read or write their own trips, photos and publications.
--   * Published memories are snapshots. Public ones are listable; unlisted and
--     private ones are only reachable through get_published_memory(slug).
--   * Photos live in the private `trip-photos` bucket under
--     <owner_id>/<trip_id>/<photo_id>.<ext>. Viewers of a published memory
--     receive short-lived signed URLs generated on the server.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Reference data: destinations, themes, templates
-- (mirrors src/config/themes and src/features/templates/registry.ts)
-- ---------------------------------------------------------------------------

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name text not null check (char_length(name) between 1 and 80),
  country text not null check (char_length(country) between 1 and 80),
  region text check (region is null or char_length(region) <= 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null unique references public.destinations (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger themes_set_updated_at
  before update on public.themes
  for each row execute function public.set_updated_at();

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name text not null check (char_length(name) between 1 and 80),
  family text not null check (family in ('poster', 'journal', 'collage', 'timeline')),
  layouts text[] not null check (cardinality(layouts) >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 2000),
  destination_slug text not null references public.destinations (slug) on update cascade,
  template_slug text not null references public.templates (slug) on update cascade,
  layout text not null default '' check (char_length(layout) <= 40),
  palette text check (palette is null or char_length(palette) <= 40),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_order check (start_date is null or end_date is null or end_date >= start_date)
);

create index trips_owner_updated_idx on public.trips (owner_id, updated_at desc);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- Basic abuse prevention: cap trips per account.
create or replace function public.enforce_trip_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.trips where owner_id = new.owner_id) >= 100 then
    raise exception 'trip_limit_reached' using errcode = 'P0001',
      hint = 'An account can hold up to 100 trips.';
  end if;
  return new;
end;
$$;

create trigger trips_enforce_limit
  before insert on public.trips
  for each row execute function public.enforce_trip_limit();

-- ---------------------------------------------------------------------------
-- Trip photos
-- ---------------------------------------------------------------------------

create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  width integer not null check (width between 1 and 12000),
  height integer not null check (height between 1 and 12000),
  caption text not null default '' check (char_length(caption) <= 280),
  location text not null default '' check (char_length(location) <= 120),
  taken_on date,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Storage path must live inside the owner's and trip's folder.
  constraint trip_photos_path_scope check (
    split_part(storage_path, '/', 1) = owner_id::text
    and split_part(storage_path, '/', 2) = trip_id::text
    and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  )
);

create index trip_photos_trip_position_idx on public.trip_photos (trip_id, position);
create index trip_photos_owner_idx on public.trip_photos (owner_id);

create trigger trip_photos_set_updated_at
  before update on public.trip_photos
  for each row execute function public.set_updated_at();

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.trip_photos where trip_id = new.trip_id) >= 60 then
    raise exception 'photo_limit_reached' using errcode = 'P0001',
      hint = 'A trip can hold up to 60 photos.';
  end if;
  return new;
end;
$$;

create trigger trip_photos_enforce_limit
  before insert on public.trip_photos
  for each row execute function public.enforce_photo_limit();

-- A photo's owner must own the trip it belongs to.
create or replace function public.check_photo_trip_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.trips t where t.id = new.trip_id and t.owner_id = new.owner_id
  ) then
    raise exception 'photo_trip_owner_mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trip_photos_check_owner
  before insert or update of trip_id, owner_id on public.trip_photos
  for each row execute function public.check_photo_trip_owner();

-- Touch the parent trip so "last edited" reflects photo changes.
create or replace function public.touch_trip_from_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.trips set updated_at = now() where id = coalesce(new.trip_id, old.trip_id);
  return null;
end;
$$;

create trigger trip_photos_touch_trip
  after insert or update or delete on public.trip_photos
  for each row execute function public.touch_trip_from_photo();

-- ---------------------------------------------------------------------------
-- Published memories
-- ---------------------------------------------------------------------------

create table public.published_memories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 8 and 90
    and slug not like 'sample-%'
  ),
  visibility text not null check (visibility in ('public', 'unlisted', 'private')),
  allow_indexing boolean not null default false,
  -- Snapshot of the memory at publish time (title, text, theme, photo metadata).
  content jsonb not null,
  -- Storage paths referenced by the snapshot, for signing and cleanup.
  photo_paths text[] not null default '{}',
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only public memories may be indexed by search engines.
  constraint published_indexing_requires_public check (allow_indexing = false or visibility = 'public')
);

create index published_memories_owner_idx on public.published_memories (owner_id);
create index published_memories_public_idx on public.published_memories (published_at desc)
  where visibility = 'public';

create trigger published_memories_set_updated_at
  before update on public.published_memories
  for each row execute function public.set_updated_at();

create or replace function public.check_publication_trip_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.trips t where t.id = new.trip_id and t.owner_id = new.owner_id
  ) then
    raise exception 'publication_trip_owner_mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger published_memories_check_owner
  before insert or update of trip_id, owner_id on public.published_memories
  for each row execute function public.check_publication_trip_owner();

-- Returns a published memory by slug when the caller may see it:
-- public and unlisted to everyone, private only to its owner.
-- Unlisted memories can therefore be opened by URL but never enumerated.
create or replace function public.get_published_memory(p_slug text)
returns table (
  slug text,
  visibility text,
  allow_indexing boolean,
  content jsonb,
  photo_paths text[],
  published_at timestamptz,
  updated_at timestamptz,
  is_owner boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pm.slug,
    pm.visibility,
    pm.allow_indexing,
    pm.content,
    pm.photo_paths,
    pm.published_at,
    pm.updated_at,
    (pm.owner_id = auth.uid()) as is_owner
  from public.published_memories pm
  where pm.slug = p_slug
    and (
      pm.visibility in ('public', 'unlisted')
      or pm.owner_id = auth.uid()
    )
  limit 1;
$$;

revoke all on function public.get_published_memory(text) from public;
grant execute on function public.get_published_memory(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.themes enable row level security;
alter table public.templates enable row level security;
alter table public.trips enable row level security;
alter table public.trip_photos enable row level security;
alter table public.published_memories enable row level security;

-- Profiles: owner only. Rows are created by the auth trigger.
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Reference data is readable by everyone and writable by nobody via the API.
create policy "Anyone reads destinations" on public.destinations
  for select to anon, authenticated using (true);
create policy "Anyone reads themes" on public.themes
  for select to anon, authenticated using (true);
create policy "Anyone reads templates" on public.templates
  for select to anon, authenticated using (true);

-- Trips: owner only.
create policy "Owners read trips" on public.trips
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners create trips" on public.trips
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update trips" on public.trips
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete trips" on public.trips
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Trip photos: owner only.
create policy "Owners read photos" on public.trip_photos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners add photos" on public.trip_photos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update photos" on public.trip_photos
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete photos" on public.trip_photos
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Published memories: owners manage their own; anyone may list public ones.
create policy "Owners read own publications" on public.published_memories
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Anyone reads public publications" on public.published_memories
  for select to anon, authenticated using (visibility = 'public');
create policy "Owners publish" on public.published_memories
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update publications" on public.published_memories
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners unpublish" on public.published_memories
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored as <owner_id>/<trip_id>/<file>. Users may only touch
-- objects in their own folder, and only for trips they own.
create policy "Owners read trip photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners upload trip photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.trips t
      where t.id::text = (storage.foldername(name))[2]
        and t.owner_id = (select auth.uid())
    )
  );

create policy "Owners update trip photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners delete trip photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
