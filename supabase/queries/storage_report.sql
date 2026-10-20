-- Storage report: one table with everything about storage use, per user and in total.
--
-- Run it in the Supabase dashboard (SQL Editor). It reads the private `storage` schema, so it must run
-- as the project owner, not from the app. It changes nothing.
--
-- Columns
--   used_mb        files actually stored in Supabase Storage (all three buckets)
--   trip_mb / book_mb / avatar_mb   the same, split by bucket
--   files          number of stored files
--   recorded_mb    size the app has recorded in the database for trip photos
--   pending_files  files in Storage that no database row points to (uploads that never finished, or
--                  leftovers after a delete). These are the safe-to-clean-up ones.
--   pending_mb     their total size
--   missing_files  database rows whose file is not in Storage (broken photos)
--   quota_mb       your plan's storage allowance (edit the number below)
--   quota_used_%   used_mb as a share of quota_mb (shown on the TOTAL row)
--   remaining_mb   what is left of the allowance
--   big_file_mb    largest single file
--   last_upload    most recent upload

with params as (
  select 1024::numeric as quota_mb            -- Free plan = 1 GB. Pro = 102400 (100 GB).
),
objs as (
  select
    o.bucket_id,
    o.name,
    nullif((storage.foldername(o.name))[1], '')                as owner_folder,
    coalesce((o.metadata ->> 'size')::bigint, 0)               as bytes,
    o.created_at
  from storage.objects o
  where o.bucket_id in ('trip-photos', 'book-images', 'avatars')
),
-- Every file a database row points to.
known as (
  select storage_path as name, 'trip-photos'::text as bucket_id from public.trip_photos
  union all
  select storage_path, 'book-images' from public.book_images
  union all
  select avatar_path, 'avatars' from public.profiles where avatar_path is not null
),
per_object as (
  select
    ob.*,
    (k.name is null) as pending
  from objs ob
  left join known k on k.name = ob.name and k.bucket_id = ob.bucket_id
),
per_user as (
  select
    owner_folder,
    count(*)                                                       as files,
    sum(bytes)                                                     as used_bytes,
    sum(bytes) filter (where bucket_id = 'trip-photos')            as trip_bytes,
    sum(bytes) filter (where bucket_id = 'book-images')            as book_bytes,
    sum(bytes) filter (where bucket_id = 'avatars')                as avatar_bytes,
    count(*) filter (where pending)                                as pending_files,
    sum(bytes) filter (where pending)                              as pending_bytes,
    max(bytes)                                                     as big_bytes,
    max(created_at)                                                as last_upload
  from per_object
  group by owner_folder
),
recorded as (
  select owner_id::text as owner_folder, sum(size_bytes) as recorded_bytes from public.trip_photos group by owner_id
),
missing as (
  select k.owner_folder, count(*) as missing_files
  from (
    select owner_id::text as owner_folder, storage_path as name, 'trip-photos'::text as bucket_id from public.trip_photos
    union all
    select owner_id::text, storage_path, 'book-images' from public.book_images
  ) k
  where not exists (select 1 from objs ob where ob.name = k.name and ob.bucket_id = k.bucket_id)
  group by k.owner_folder
),
rows_ as (
  select
    coalesce(p.email, u.owner_folder, '(no owner)')                as who,
    u.files,
    u.used_bytes, u.trip_bytes, u.book_bytes, u.avatar_bytes,
    coalesce(r.recorded_bytes, 0)                                  as recorded_bytes,
    u.pending_files, coalesce(u.pending_bytes, 0)                  as pending_bytes,
    coalesce(m.missing_files, 0)                                   as missing_files,
    u.big_bytes, u.last_upload,
    0 as sort
  from per_user u
  left join auth.users p on p.id::text = u.owner_folder
  left join recorded r on r.owner_folder = u.owner_folder
  left join missing m on m.owner_folder = u.owner_folder
),
total as (
  select
    'TOTAL (all users)'::text, sum(files)::bigint,
    sum(used_bytes), sum(trip_bytes), sum(book_bytes), sum(avatar_bytes),
    sum(recorded_bytes), sum(pending_files)::bigint, sum(pending_bytes),
    sum(missing_files)::bigint, max(big_bytes), max(last_upload),
    1 as sort
  from rows_
)
select
  t.who                                                            as "user",
  t.files                                                          as files,
  round(coalesce(t.used_bytes, 0)   / 1048576.0, 2)                as used_mb,
  round(coalesce(t.trip_bytes, 0)   / 1048576.0, 2)                as trip_mb,
  round(coalesce(t.book_bytes, 0)   / 1048576.0, 2)                as book_mb,
  round(coalesce(t.avatar_bytes, 0) / 1048576.0, 2)                as avatar_mb,
  round(t.recorded_bytes / 1048576.0, 2)                           as recorded_mb,
  coalesce(t.pending_files, 0)                                     as pending_files,
  round(t.pending_bytes / 1048576.0, 2)                            as pending_mb,
  t.missing_files                                                  as missing_files,
  round(coalesce(t.big_bytes, 0) / 1048576.0, 2)                   as big_file_mb,
  case when t.sort = 1 then (select quota_mb from params) end      as quota_mb,
  case when t.sort = 1 then round(100 * coalesce(t.used_bytes, 0) / 1048576.0 / (select quota_mb from params), 1) end as "quota_used_%",
  case when t.sort = 1 then round((select quota_mb from params) - coalesce(t.used_bytes, 0) / 1048576.0, 2) end as remaining_mb,
  t.last_upload                                                    as last_upload
from (select * from rows_ union all select * from total) t
order by t.sort, t.used_bytes desc nulls last;
