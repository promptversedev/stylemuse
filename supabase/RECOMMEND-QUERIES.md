# The recommendation queries

Tables from `0011_reference_recommendation.sql`, filled by `scripts/import-reference.mjs`. The route that serves a recommendation does
three things, all against these tables. (Tested in `scripts` against the real data: the vote returns what the Python engine returns.)

## 1. The photoshoots most like the garment

The analysed garment gives its **main colour** (the colour with the largest share, as sRGB) and its share. Convert the colour to CIE Lab
with the same formula as `recommender.py` (`to_lab`), then:

```sql
select id, main_name, main_share, main_l, main_a, main_b, colours, skin_tone, body_type,
       sqrt((main_l - $1)^2 + (main_a - $2)^2 + (main_b - $3)^2) as gap
from public.reference_photoshoots
where category_family = $4                     -- the garment's family: 'saree'
  and sqrt((main_l - $1)^2 + (main_a - $2)^2 + (main_b - $3)^2) <= $5     -- MAJOR_GAP, 28
order by gap
limit 300;
```

The route scores these rows as the engine does (`main_colour_rows`: 60 points how near the main colour is, 25 how much of that colour the
photoshoot has compared with the garment, 15 how alike the rest of the colours are), keeps the best 20 to 30, and uses their ids below.
When fewer than 20 have the same main colour, the nearest ones of other colours fill up to 20 (they rank after the right-colour ones).

## 2. The vote: how many of those photoshoots picked each catalogue item

`$1` = the ids from step 1, `$2` = how many nearest each photoshoot picks (the "3", any value up to the `keep` used when exporting),
`$3` = how many to return.

```sql
-- backgrounds
select n.background_id as id, count(*)::int as picks, sum(n.likeness) as total_likeness, avg(n.likeness) as mean_likeness
from public.reference_nearest n
where n.kind = 'background' and n.photoshoot_id = any($1::text[]) and n.rank <= $2
group by n.background_id
order by picks desc, total_likeness desc
limit $3;

-- jewellery (same, kind = 'jewellery', group by n.jewellery_id)
```

The share shown on a card is `picks / (number of photoshoots in $1 that have a row of that kind)`.

## 3. Turn ids into what the picker needs

`backgrounds`, `jewellery` (with `makeup_original_key`) and `models` already hold `name`, `image_key` and `original_key`: build the
thumbnail and original urls with `r2PublicUrl`, exactly as `/api/picks` does, so a recommended card is the same shape as a picked item.

Models are not precomputed: they come from the look / region rules plus the skin tone and body type counted over the same photoshoots
(`reference_photoshoots.skin_tone`, `body_type`), against `catalogue_analysis.analysis` of the models.
