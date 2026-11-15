-- The analysis of every catalogue picture (colours, objects, mood, jewellery pieces, makeup, ...), one JSON document per item.
--
-- Why a separate table and not a column on models / backgrounds / jewellery:
--   * those three tables are publicly readable (their RLS policy is `using (true)`), and anyone holding the public anon key can
--     read every column through the Supabase REST API. The analysis is not something to hand out, so it lives here, with RLS
--     switched on and NO policy: only the server's service-role key can read or write it (the same arrangement as
--     integration_clients).
--   * one shape for all three kinds, and room for hairstyles later.
--
-- One row per catalogue item; exactly one of model_id / background_id / jewellery_id is set. Deleting a catalogue item deletes
-- its analysis. The data itself arrives in 0010_catalogue_analysis_data.sql.

create table if not exists public.catalogue_analysis (
  id             uuid primary key default gen_random_uuid(),
  model_id       uuid references public.models(id)      on delete cascade,
  background_id  uuid references public.backgrounds(id) on delete cascade,
  jewellery_id   uuid references public.jewellery(id)   on delete cascade,
  -- The id used inside the analysis files: '250' (background), '30' (model), 'J36' / 'clean-12.J' / '12' (saree / lehenga / kurti
  -- jewellery). Kept so the analysis can be traced back to its source file; it is NOT the catalogue number (see 0010).
  drive_id       text not null,
  -- jewellery only: 'Saree', 'Lehenga' or 'Kurti'. Drive ids repeat across these (kurti '1' and saree 'J1' are different items).
  category       text,
  -- The whole analysis record, exactly as written by the analysis step.
  analysis       jsonb not null,
  analysed_at    timestamptz not null default now(),
  constraint catalogue_analysis_one_item check (num_nonnulls(model_id, background_id, jewellery_id) = 1),
  constraint catalogue_analysis_category check (category is null or category in ('Saree', 'Lehenga', 'Kurti')),
  constraint catalogue_analysis_object check (jsonb_typeof(analysis) = 'object')
);

-- An item has at most one analysis, and a source id is used by at most one item of its kind.
create unique index if not exists catalogue_analysis_model_key      on public.catalogue_analysis (model_id)      where model_id is not null;
create unique index if not exists catalogue_analysis_background_key on public.catalogue_analysis (background_id) where background_id is not null;
create unique index if not exists catalogue_analysis_jewellery_key  on public.catalogue_analysis (jewellery_id)  where jewellery_id is not null;
create unique index if not exists catalogue_analysis_model_drive      on public.catalogue_analysis (drive_id)             where model_id is not null;
create unique index if not exists catalogue_analysis_background_drive on public.catalogue_analysis (drive_id)             where background_id is not null;
create unique index if not exists catalogue_analysis_jewellery_drive  on public.catalogue_analysis (category, drive_id)   where jewellery_id is not null;

-- Private: RLS on, no policy. The service role bypasses RLS; the anon and authenticated roles see nothing.
alter table public.catalogue_analysis enable row level security;
revoke all on public.catalogue_analysis from anon, authenticated;
