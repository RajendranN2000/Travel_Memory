-- Reel editing settings and finished-reel details saved to the owner's account so they follow the
-- user between devices. The rendered video files themselves stay in the browser that made them
-- (IndexedDB); only their details are stored here.

create table public.reel_projects (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  trip_id text not null check (char_length(trip_id) between 1 and 80),
  draft jsonb,
  saved jsonb,
  saved_at text,
  -- Client timestamp (ms) so the newest copy wins when devices sync.
  updated_at_ms bigint not null,
  primary key (owner_id, trip_id)
);

create table public.reel_exports (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{4,80}$'),
  trip_id text not null check (char_length(trip_id) between 1 and 80),
  meta jsonb not null,
  created_at_ms bigint not null,
  primary key (owner_id, id)
);

create index reel_exports_owner_created_idx on public.reel_exports (owner_id, created_at_ms desc);

alter table public.reel_projects enable row level security;
alter table public.reel_exports enable row level security;

create policy "Owners read reel projects" on public.reel_projects
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners create reel projects" on public.reel_projects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update reel projects" on public.reel_projects
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete reel projects" on public.reel_projects
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Owners read reel exports" on public.reel_exports
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners create reel exports" on public.reel_exports
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners update reel exports" on public.reel_exports
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete reel exports" on public.reel_exports
  for delete to authenticated using (owner_id = (select auth.uid()));
