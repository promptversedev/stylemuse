-- Adds a column for the full-resolution "original" image, separate from
-- image_key (the thumbnail). The app only ever displays image_key — this
-- exists so the real, full-res asset is preserved in R2/DB for whatever
-- later needs it (e.g. an actual generation pipeline), without the picker
-- grids ever loading full-size images just to show a small tile.

alter table public.models add column if not exists original_key text;
alter table public.backgrounds add column if not exists original_key text;
