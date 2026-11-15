-- Data for the garment recommendation ("which backgrounds / accessories go with this garment").
--
-- reference_photoshoots : one row per analysed reference photoshoot (the brand photoshoots the recommendation learns from).
--                         Only what is needed to find the photoshoots whose garment is like an uploaded one: the garment's main
--                         colour (also as CIE Lab, so "how near" is one distance), all its colours, and what its model was.
-- reference_nearest     : for EVERY reference photoshoot, its nearest StyleMuse backgrounds and jewellery sets (rank 1 = the nearest),
--                         worked out once, offline, by comparing the photoshoot's own background / jewellery with every catalogue
--                         item by colour and objects. The 10 nearest are kept, so "each photoshoot picks its 3 nearest" can be
--                         changed to any number up to 10 with a WHERE rank <= N and no recomputing.
--
-- The recommendation is then one query: take the ~30 photoshoots most like the garment, count how many of them picked each
-- catalogue item among their N nearest, and return the most-picked (see supabase/RECOMMEND-QUERIES.md).
--
-- Private like catalogue_analysis: RLS on with no policy, so only the service role (the server) can read or write them.
-- Filled by scripts/import-reference.mjs from the files the Colab export notebook writes; re-running it replaces everything.

create table if not exists public.reference_photoshoots (
  id               text primary key,                      -- '0603_1105549PA'
  brand            text,                                  -- 'sudathi', 'libas', 'ragthm', 'suta'
  category_family  text not null,                         -- 'saree' (lehenga / kurti when those are analysed)
  category         text,
  occasion         text,
  fabric           text,
  design_pattern   text,
  work_level       text,
  main_name        text not null,                         -- 'emerald green'
  main_share       real not null check (main_share >= 0 and main_share <= 1),   -- how much of the garment is that colour
  main_l           real not null,                         -- CIE Lab of the main colour: distance between two of these is the
  main_a           real not null,                         -- "gap" the matching uses (0 = same shade, ~10 = clearly the same colour)
  main_b           real not null,
  colours          jsonb not null,                        -- [{name, rgb:[r,g,b], percent}] the whole garment
  skin_tone        text,                                  -- what its model was: used to vote for the model
  body_type        text,
  imported_at      timestamptz not null default now()
);
create index if not exists reference_photoshoots_family on public.reference_photoshoots (category_family);

create table if not exists public.reference_nearest (
  photoshoot_id    text not null references public.reference_photoshoots(id) on delete cascade,
  kind             text not null check (kind in ('background', 'jewellery')),
  rank             smallint not null check (rank >= 1),
  background_id    uuid references public.backgrounds(id) on delete cascade,
  jewellery_id     uuid references public.jewellery(id)   on delete cascade,
  likeness         real not null check (likeness >= 0 and likeness <= 1),
  primary key (photoshoot_id, kind, rank),
  constraint reference_nearest_one_item check (
    (kind = 'background' and background_id is not null and jewellery_id is null) or
    (kind = 'jewellery'  and jewellery_id  is not null and background_id is null)
  )
);
-- The vote groups by catalogue item, so these two are what it reads.
create index if not exists reference_nearest_background on public.reference_nearest (background_id, rank) where background_id is not null;
create index if not exists reference_nearest_jewellery  on public.reference_nearest (jewellery_id, rank)  where jewellery_id is not null;

alter table public.reference_photoshoots enable row level security;
alter table public.reference_nearest     enable row level security;
revoke all on public.reference_photoshoots from anon, authenticated;
revoke all on public.reference_nearest     from anon, authenticated;
