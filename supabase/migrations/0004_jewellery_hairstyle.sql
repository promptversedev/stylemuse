-- Adds two more pickers alongside models/backgrounds: jewellery and hairstyle.
--
-- jewellery is a single row per look but carries TWO images — the jewellery
-- shot (jewellery_key) and the makeup look that was styled to go with it
-- (makeup_key). They are not separate catalogues joined by a shared id;
-- keeping them as one row is what makes the pairing unbreakable — there is
-- no id to keep in sync, selecting the row *is* selecting both images. Every
-- reader (the app, /api/embed/[token], /api/picks) returns both urls
-- together for exactly that reason.

create table if not exists public.jewellery (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  jewellery_key         text not null,
  makeup_key            text not null,
  jewellery_original_key text,
  makeup_original_key    text,
  category              text,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now()
);

alter table public.jewellery enable row level security;

create policy "jewellery is publicly readable"
  on public.jewellery for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- hairstyles — the "Select Hairstyle" picker. Same shape as backgrounds.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.hairstyles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_key   text not null,
  original_key text,
  category    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.hairstyles enable row level security;

create policy "hairstyles are publicly readable"
  on public.hairstyles for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- favorites / selections — extend the existing model+background columns
-- rather than a new table, same reasoning as the original schema.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.favorites drop constraint if exists favorites_item_type_check;
alter table public.favorites add constraint favorites_item_type_check
  check (item_type in ('model', 'background', 'jewellery', 'hairstyle'));

alter table public.selections
  add column if not exists jewellery_id uuid references public.jewellery(id) on delete set null,
  add column if not exists hairstyle_id uuid references public.hairstyles(id) on delete set null;
