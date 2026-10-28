-- Search backgrounds by the words in their title.
--
-- A dedicated tsvector over the title alone, so a search finds exactly the
-- titles that contain the words typed — not a background whose element list
-- happens to mention them. 'simple' config: words are matched as written
-- (lower-cased), with no English stemming or stop-word removal, so every word
-- visible in a title can be searched, "with" and "and" included.
alter table public.backgrounds
  add column if not exists title_search tsvector
  generated always as (to_tsvector('simple', coalesce(title, ''))) stored;

create index if not exists backgrounds_title_search_idx
  on public.backgrounds using gin (title_search);

-- Same signature as 0007, now over titles: each word typed is a prefix
-- ("chand" finds Chandelier), all must match, best match first.
create or replace function public.search_backgrounds(q text)
returns table (id uuid, rank real)
language sql
stable
parallel safe
as $$
  with words as (
    select string_agg(w || ':*', ' & ') as tsq
    from (
      select w
      from regexp_split_to_table(lower(coalesce(q, '')), '[^a-z0-9]+') as w
      where w <> ''
      limit 8
    ) t
  )
  select b.id, ts_rank(b.title_search, to_tsquery('simple', words.tsq)) as rank
  from public.backgrounds b, words
  where words.tsq is not null
    and b.title_search @@ to_tsquery('simple', words.tsq)
  order by rank desc, b.sort_order
  limit 400;
$$;

grant execute on function public.search_backgrounds(text) to anon, authenticated;
