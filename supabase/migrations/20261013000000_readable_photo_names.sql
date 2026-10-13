-- Allow an optional readable prefix in photo file names, e.g.
-- <owner>/<trip>/eiffel-tower-<photo-id>.jpg. The owner and trip folders and the
-- trailing photo id stay UUIDs, so the storage policies are unchanged.
alter table public.trip_photos drop constraint trip_photos_path_scope;

alter table public.trip_photos add constraint trip_photos_path_scope check (
  split_part(storage_path, '/', 1) = owner_id::text
  and split_part(storage_path, '/', 2) = trip_id::text
  and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/([a-z0-9-]{1,40}-)?[0-9a-f-]{36}\.(jpg|png|webp)$'
);
