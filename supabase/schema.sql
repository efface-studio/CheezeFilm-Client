-- 치즈필름 Supabase schema
-- Translated from data/cheezefilm.db (SQLite). Run once on a fresh
-- Supabase project. Idempotent: every `create` uses `if not exists`
-- so re-running is safe.
--
-- All tables live in the `public` schema. RLS is enabled but with NO
-- public policies — the app talks to Postgres via the service-role key
-- on the server side only (better-sqlite3 had no row-level security so
-- we keep parity by trusting the server). The anon key is used for
-- read-only public queries through specific policies below.

-- ────────────────────────────────────────────────────────────
-- members — the cast roster (slug-keyed, ~95 rows).
-- ────────────────────────────────────────────────────────────
create table if not exists public.members (
  slug          text primary key,
  name          text not null,
  name_en       text not null default '',
  role          text not null default 'actor',
  role_label    text not null default '',
  highlight     text not null default '',
  bio           text not null default '',
  works         jsonb not null default '[]'::jsonb,
  joined_note   text,
  instagram     text,
  source_url    text,
  accent        text not null default 'purple',
  uncertain     boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_members_sort on public.members(sort_order asc);

-- ────────────────────────────────────────────────────────────
-- audition_listings — open positions / casting calls.
-- ────────────────────────────────────────────────────────────
create table if not exists public.audition_listings (
  id            bigserial primary key,
  title         text not null,
  description   text not null default '',
  role_type     text not null default 'lead',
  requirements  text not null default '',
  deadline      text,
  status        text not null default 'open',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_listings_status
  on public.audition_listings(status, created_at desc);

-- ────────────────────────────────────────────────────────────
-- auditions — submissions tied to a listing.
-- ────────────────────────────────────────────────────────────
create table if not exists public.auditions (
  id               bigserial primary key,
  name             text not null,
  age              integer,
  gender           text,
  phone            text,
  email            text not null,
  experience       text,
  role_preference  text,
  intro            text not null,
  portfolio_url    text,
  photo_url        text,
  status           text not null default 'pending',
  listing_id       bigint references public.audition_listings(id) on delete set null,
  birthdate        text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_auditions_created on public.auditions(created_at desc);
create index if not exists idx_auditions_listing on public.auditions(listing_id);

-- ────────────────────────────────────────────────────────────
-- fan_messages — fan letters.
-- ────────────────────────────────────────────────────────────
create table if not exists public.fan_messages (
  id              bigserial primary key,
  nickname        text not null,
  email           text,
  favorite_work   text,
  message         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_fan_messages_created
  on public.fan_messages(created_at desc);

-- ────────────────────────────────────────────────────────────
-- site_content — admin-editable copy (key/value).
-- ────────────────────────────────────────────────────────────
create table if not exists public.site_content (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- updated_at triggers — Postgres doesn't auto-update like SQLite.
-- ────────────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tg_listings_touch on public.audition_listings;
create trigger tg_listings_touch
  before update on public.audition_listings
  for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_site_content_touch on public.site_content;
create trigger tg_site_content_touch
  before update on public.site_content
  for each row execute function public.tg_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- RLS — enable on every table. We don't add SELECT policies for the
-- anon role because the app always queries server-side using the
-- service_role key. If we ever need direct browser→Supabase reads
-- (real-time feed, etc.), add `for select using (true)` policies then.
-- ────────────────────────────────────────────────────────────
alter table public.members          enable row level security;
alter table public.audition_listings enable row level security;
alter table public.auditions        enable row level security;
alter table public.fan_messages     enable row level security;
alter table public.site_content     enable row level security;

-- ────────────────────────────────────────────────────────────
-- Storage buckets — created via the Storage API in the dashboard.
-- For reference, we'll need:
--   - members   (public read)   — member portraits
--   - covers    (public read)   — V2 hero cover photos
--   - auditions (private)       — applicant submitted photos
--   - reels     (public read)   — IG reels mirrored locally
-- ────────────────────────────────────────────────────────────
