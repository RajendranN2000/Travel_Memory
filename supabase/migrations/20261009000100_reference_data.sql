-- Reference data for destinations, themes and templates.
-- The visual theme definitions live in src/config/themes/*.ts (the source of
-- truth for rendering); these rows provide referential integrity for trips and
-- a record of which palettes each theme offers. Keep both in sync; the unit
-- test tests/unit/reference-data.test.ts fails if they drift.

insert into public.destinations (slug, name, country, region) values
  ('munnar', 'Munnar', 'India', 'Kerala'),
  ('goa', 'Goa', 'India', 'Konkan coast'),
  ('ooty', 'Ooty', 'India', 'Nilgiris, Tamil Nadu'),
  ('wayanad', 'Wayanad', 'India', 'Kerala'),
  ('manali', 'Manali', 'India', 'Himachal Pradesh')
on conflict (slug) do update
  set name = excluded.name, country = excluded.country, region = excluded.region;

insert into public.themes (destination_id, config)
select d.id, t.config::jsonb
from (values
  ('munnar', '{"source": "src/config/themes/munnar.ts", "palettes": ["tea-estate", "morning-mist", "cardamom-dusk"], "imageTreatment": "mist"}'),
  ('goa', '{"source": "src/config/themes/goa.ts", "palettes": ["sunset-shack", "arabian-sea", "monsoon-night"], "imageTreatment": "golden"}'),
  ('ooty', '{"source": "src/config/themes/ooty.ts", "palettes": ["nilgiri-fog", "silver-oak", "botanical-rose"], "imageTreatment": "cool-fog"}'),
  ('wayanad', '{"source": "src/config/themes/wayanad.ts", "palettes": ["forest-floor", "laterite", "rainforest"], "imageTreatment": "earthy"}'),
  ('manali', '{"source": "src/config/themes/manali.ts", "palettes": ["alpine-morning", "deodar", "snowline"], "imageTreatment": "alpine"}')
) as t (slug, config)
join public.destinations d on d.slug = t.slug
on conflict (destination_id) do update set config = excluded.config;

insert into public.templates (slug, name, family, layouts) values
  ('horizon-poster', 'Horizon Poster', 'poster', array['full-bleed', 'framed']),
  ('field-journal', 'Field Journal', 'journal', array['classic', 'wide']),
  ('contact-sheet', 'Contact Sheet', 'collage', array['mosaic', 'scrapbook']),
  ('day-by-day', 'Day by Day', 'timeline', array['vertical', 'alternating'])
on conflict (slug) do update
  set name = excluded.name, family = excluded.family, layouts = excluded.layouts;
