-- Structured details for each background, from its JSON description:
--
--   { "name": "...", "category": "Courtyard", "environment": "Outdoor",
--     "color_palette": ["light cream - rgb(246, 237, 224)", ...],
--     "visible_elements": ["octagonal domed pavilion ...", ...],
--     "lighting": { "type": "...", "quality": "...", "mood": "..." } }
--
-- The fields people filter or search by get their own columns so they can be
-- indexed; `details` keeps the JSON exactly as supplied, so nothing in it is
-- lost even where it has no column. `name` stays the short grid label
-- ("Background 12"); the descriptive name goes in `title`.

alter table public.backgrounds
  add column if not exists title            text,
  add column if not exists environment      text,
  -- [{ "name": "light cream", "rgb": [246, 237, 224] }, ...]
  add column if not exists color_palette    jsonb not null default '[]'::jsonb,
  add column if not exists visible_elements text[] not null default '{}',
  add column if not exists lighting_type    text,
  add column if not exists lighting_quality text,
  add column if not exists lighting_mood    text,
  add column if not exists details          jsonb;

-- array_to_string is only STABLE, which a generated column will not accept.
-- For a text[] it cannot vary, so this wrapper is safe to mark IMMUTABLE.
create or replace function public.text_array_join(arr text[])
returns text
language sql
immutable
parallel safe
as $$ select coalesce(array_to_string(arr, ' '), '') $$;

-- One full-text column over everything worth searching. Weighted so a match
-- in the title or category ranks above one deep in the element list.
alter table public.backgrounds
  add column if not exists search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(environment, '')), 'B') ||
    setweight(to_tsvector('english',
      public.text_array_join(visible_elements) || ' ' ||
      coalesce(lighting_type, '') || ' ' || coalesce(lighting_quality, '') || ' ' || coalesce(lighting_mood, '')
    ), 'C')
  ) stored;

-- Filters always come back in grid order, so sort_order rides in the index and
-- a filtered page is read straight off it.
create index if not exists backgrounds_category_idx    on public.backgrounds (category, sort_order);
create index if not exists backgrounds_environment_idx on public.backgrounds (environment, sort_order);
-- "Has a chandelier", "has arches": containment on the element list.
create index if not exists backgrounds_elements_idx    on public.backgrounds using gin (visible_elements);
create index if not exists backgrounds_search_idx      on public.backgrounds using gin (search);
