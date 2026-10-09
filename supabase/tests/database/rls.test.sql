-- Row Level Security tests. Run with: pnpm exec supabase test db
-- (requires the local Supabase stack: pnpm exec supabase start)
begin;
select plan(16);

-- Two users. The auth trigger creates their profiles.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@example.test', '{"display_name":"Alice"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@example.test', '{}', 'authenticated', 'authenticated');

select is((select display_name from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Alice', 'profile created on sign-up');

-- Alice's data, created as Alice.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

insert into public.trips (id, owner_id, title, destination_slug, template_slug)
values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alice trip', 'munnar', 'field-journal');
insert into public.trip_photos (id, trip_id, owner_id, storage_path, mime_type, size_bytes, width, height)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
        'image/jpeg', 1000, 100, 100);
insert into public.published_memories (trip_id, owner_id, slug, visibility, content, photo_paths)
values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice-trip-unlisted01', 'unlisted', '{}', '{}');

select is((select count(*)::int from public.trips), 1, 'owner sees own trip');

select throws_ok(
  $$insert into public.trips (owner_id, title, destination_slug, template_slug)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Forged', 'goa', 'horizon-poster')$$,
  '42501', null, 'cannot create a trip for someone else');

select throws_ok(
  $$insert into public.trips (owner_id, title, destination_slug, template_slug)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Bad', 'atlantis', 'horizon-poster')$$,
  '23503', null, 'destination must exist');

select throws_ok(
  $$update public.trips set start_date = '2025-02-01', end_date = '2025-01-01' where id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null, 'end date cannot precede start date');

select throws_ok(
  $$insert into public.trip_photos (trip_id, owner_id, storage_path, mime_type, size_bytes, width, height)
    values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.jpg',
            'image/jpeg', 10, 1, 1)$$,
  '23514', null, 'photo path must be inside the owner folder');

-- Bob cannot see or change Alice's data.
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select is((select count(*)::int from public.trips), 0, 'other users cannot read trips');
select is((select count(*)::int from public.trip_photos), 0, 'other users cannot read photos');
select is((select count(*)::int from public.published_memories), 0, 'unlisted memories are not listable');
update public.trips set title = 'Hacked' where id = '11111111-1111-4111-8111-111111111111';
delete from public.trip_photos where id = '22222222-2222-4222-8222-222222222222';

select throws_ok(
  $$insert into public.trip_photos (trip_id, owner_id, storage_path, mime_type, size_bytes, width, height)
    values ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg',
            'image/jpeg', 10, 1, 1)$$,
  '42501', null, 'cannot add photos to someone else''s trip');

select is((select count(*)::int from public.get_published_memory('alice-trip-unlisted01')), 1, 'unlisted memory opens by slug');

-- Anonymous visitors.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.published_memories), 0, 'anonymous visitors cannot list unlisted memories');
select is((select count(*)::int from public.get_published_memory('alice-trip-unlisted01')), 1, 'anonymous visitors can open an unlisted link');

-- Make it private: only the owner may open it.
reset role;
update public.published_memories set visibility = 'private' where slug = 'alice-trip-unlisted01';
set local role anon;
select is((select count(*)::int from public.get_published_memory('alice-trip-unlisted01')), 0, 'private memories are hidden from visitors');
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is((select is_owner from public.get_published_memory('alice-trip-unlisted01')), true, 'owner can open a private memory');

reset role;
select is((select title from public.trips where id = '11111111-1111-4111-8111-111111111111'), 'Alice trip', 'other users'' updates and deletes had no effect');

select * from finish();
rollback;
