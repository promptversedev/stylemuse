-- Reshape jewellery to the same image_key / original_key pair models,
-- backgrounds and hairstyles use: image_key is the thumbnail the grids draw,
-- original_key the full-resolution file generation consumes.
--
-- The makeup styled for each jewellery look now exists only as an original.
-- It is never shown — it rides along with the jewellery pick for generation —
-- so the makeup thumbnail column goes, and makeup_original_key stays as the
-- one makeup column. It remains on the jewellery row itself: one row is one
-- look, so the pairing cannot come apart.

alter table public.jewellery rename column jewellery_key to image_key;
alter table public.jewellery rename column jewellery_original_key to original_key;
alter table public.jewellery drop column if exists makeup_key;
