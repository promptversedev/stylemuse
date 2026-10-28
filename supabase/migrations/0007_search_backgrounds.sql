-- Search backgrounds by what is in them, best match first.
--
--   select * from search_backgrounds('chand arch');
--
-- Builds the query itself from the words typed, so callers pass plain text and
-- nothing they type can be a tsquery syntax error. Every word is a prefix
-- ("chand" finds chandelier) and all of them must match. Uses the GIN index on
-- backgrounds.search (migration 0006).
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
  select b.id, ts_rank(b.search, to_tsquery('english', words.tsq)) as rank
  from public.backgrounds b, words
  where words.tsq is not null
    and b.search @@ to_tsquery('english', words.tsq)
  order by rank desc, b.sort_order
  limit 400;
$$;

-- Backgrounds are public, so anyone may search them.
grant execute on function public.search_backgrounds(text) to anon, authenticated;
