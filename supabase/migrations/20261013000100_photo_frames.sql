-- Per-photo display settings chosen in the editor: zoom, focus point (crop
-- position), frame shape and fit. Stored as a small JSON object, e.g.
-- {"zoom": 1.4, "x": 30, "y": 60, "shape": "portrait", "fit": "cover"}.
-- The application validates the individual fields; the database only makes
-- sure it stays a small JSON object.
alter table public.trip_photos
  add column frame jsonb not null default '{}'::jsonb;

alter table public.trip_photos
  add constraint trip_photos_frame_shape check (
    jsonb_typeof(frame) = 'object' and pg_column_size(frame) <= 512
  );
