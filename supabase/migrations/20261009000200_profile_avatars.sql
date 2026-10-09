-- Profile photos.
-- Stored in the private `avatars` bucket as <user_id>/<random uuid>.jpg and
-- shown only to the signed-in owner through short-lived signed URLs.

alter table public.profiles
  add column avatar_path text
    check (
      avatar_path is null
      or (
        avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
        and split_part(avatar_path, '/', 1) = id::text
      )
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Users may only touch objects in their own folder.
create policy "Owners read avatars" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners upload avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners delete avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
