-- Pinmap real-content slice — Supabase schema draft (task 3 of issue #38)
-- Status: PROPOSAL, not merged. Nothing in the app reads this yet.
-- Principles:
--   * auth.users (Supabase Auth) owns identity; public.profiles holds display data.
--   * Rows map 1:1 onto the app's flat `item` view model, so screens keep working:
--     the load/save seam in app.js becomes the only place that talks to these tables.
--   * item_places resolves "one post = several places" AND "several posts = one place".
--   * Every table is owner-only via row level security: nobody sees anyone else's data.

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- auto-create a profile on signup
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ── collections ─────────────────────────────────────────────────────────────
create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) <= 80),
  created_at timestamptz not null default now(),
  unique (owner, name)
);
alter table public.collections enable row level security;
create policy "own collections" on public.collections
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── items (saved materials) ─────────────────────────────────────────────────
create table public.items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  url         text,
  title       text not null check (char_length(title) <= 80),
  image_url   text,
  description text,
  source_host text,                      -- e.g. youtube.com (from /api/og)
  type        text not null,             -- category shown in the UI (맛집·카페, 전시·팝업, …)
  category    text,
  memo        text check (char_length(memo) <= 300),
  ai_classified boolean not null default false,
  collection_id uuid references public.collections(id) on delete set null,
  saved_at    timestamptz not null default now()
);
create index on public.items (owner, saved_at desc);
alter table public.items enable row level security;
create policy "own items" on public.items
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── places (shared, deduplicated by map provider id) ───────────────────────
-- One row per real-world place; several items can reference the same place,
-- and one item (a post with several cafés) can reference several places.
create table public.places (
  id        uuid primary key default gen_random_uuid(),
  owner     uuid not null references auth.users(id) on delete cascade,
  name      text not null check (char_length(name) <= 120),
  address   text,
  lat       double precision not null,
  lng       double precision not null,
  osm_id    bigint,                       -- Photon/OpenStreetMap id (map provider id)
  pending   boolean not null default false, -- "장소 확인 필요" until confirmed
  created_at timestamptz not null default now(),
  unique (owner, osm_id)
);
alter table public.places enable row level security;
create policy "own places" on public.places
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── item_places (many-to-many) ──────────────────────────────────────────────
create table public.item_places (
  item_id  uuid not null references public.items(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  primary key (item_id, place_id)
);
alter table public.item_places enable row level security;
create policy "own links" on public.item_places
  for all using (
    exists (select 1 from public.items i where i.id = item_id and i.owner = auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.owner = auth.uid())
  ) with check (
    exists (select 1 from public.items i where i.id = item_id and i.owner = auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.owner = auth.uid())
  );

-- ── courses (later roadmap stage, kept here for shape review) ──────────────
create table public.courses (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,
  title      text not null default '새 코스' check (char_length(title) <= 50),
  start_date date,
  created_at timestamptz not null default now()
);
create table public.course_stops (
  course_id uuid not null references public.courses(id) on delete cascade,
  pos       int  not null,
  place_id  uuid not null references public.places(id) on delete cascade,
  time      text,
  primary key (course_id, pos)
);
alter table public.courses enable row level security;
create policy "own courses" on public.courses
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
alter table public.course_stops enable row level security;
create policy "own stops" on public.course_stops
  for all using (
    exists (select 1 from public.courses c where c.id = course_id and c.owner = auth.uid())
  ) with check (
    exists (select 1 from public.courses c where c.id = course_id and c.owner = auth.uid())
  );

-- Notes for review:
-- * places.owner keeps everything single-user-visible; if shared places are wanted
--   later, drop owner + unique(owner, osm_id) and add a visibility column.
-- * The app's flat item model is produced by one join (items + collection name +
--   first place); the load/save seam in app.js maps it — screens do not change.
-- * Storage of cover images: Supabase Storage bucket `covers`, path `{owner}/{item_id}`;
--   the /api/og function returns image_url, the client uploads or hot-links.
