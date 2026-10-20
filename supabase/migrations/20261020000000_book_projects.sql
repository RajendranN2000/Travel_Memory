-- Photo books and magazines saved to the owner's account, so they follow the user
-- across devices (they used to live only in the browser's IndexedDB).
--
-- Book ids are generated in the browser and are not globally unique, so every key
-- includes owner_id. The photos a user adds from their device go to the private
-- `book-images` bucket under <owner_id>/<project_id>/<image_id>.

create table public.book_projects (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{4,80}$'),
  trip_id text not null check (char_length(trip_id) <= 80),
  title text not null default '' check (char_length(title) <= 200),
  template_key text not null check (char_length(template_key) <= 80),
  kind text not null check (char_length(kind) <= 40),
  page_count integer not null check (page_count between 0 and 500),
  width_mm numeric not null,
  height_mm numeric not null,
  -- Client timestamps (ms since epoch) so the newest copy wins when devices sync.
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  project jsonb not null,
  primary key (owner_id, id)
);

create index book_projects_owner_updated_idx on public.book_projects (owner_id, updated_at_ms desc);
create index book_projects_owner_trip_idx on public.book_projects (owner_id, trip_id);

create table public.book_images (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  project_id text not null check (project_id ~ '^[A-Za-z0-9_-]{4,80}$'),
  image_id text not null check (image_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  name text not null default '' check (char_length(name) <= 255),
  width integer not null,
  height integer not null,
  storage_path text not null,
  primary key (owner_id, project_id, image_id),
  foreign key (owner_id, project_id) references public.book_projects (owner_id, id) on delete cascade
);

alter table public.book_projects enable row level security;
alter table public.book_images enable row level security;

create policy "Owners read books" on public.book_projects
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners create books" on public.book_projects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update books" on public.book_projects
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete books" on public.book_projects
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Owners read book images" on public.book_images
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners add book images" on public.book_images
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update book images" on public.book_images
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete book images" on public.book_images
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Storage ---------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-images', 'book-images', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners read book image files" on storage.objects
  for select to authenticated
  using (bucket_id = 'book-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners upload book image files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'book-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners update book image files" on storage.objects
  for update to authenticated
  using (bucket_id = 'book-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'book-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners delete book image files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'book-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
