-- Sample rows for models & backgrounds.
--
-- image_key must match an object you've uploaded to the R2 bucket
-- (see README "Uploading images to R2"). Run this AFTER uploading images
-- with matching keys, e.g. models/m01-ava.webp, backgrounds/b01-seamless-white.webp.
--
-- Run with:  supabase db execute -f supabase/seed.sql
-- or paste into the Supabase SQL editor.

insert into public.models (name, image_key, gender, age_group, body_type, region, sort_order) values
  ('Ava',    'models/m01-ava.webp',    'Female', 'Adult',  'Slim',     'Latina',    1),
  ('Mia',    'models/m02-mia.webp',    'Female', 'Adult',  'Average',  'Caucasian', 2),
  ('Zoe',    'models/m03-zoe.webp',    'Female', 'Adult',  'Slim',     'Asian',     3),
  ('Isla',   'models/m04-isla.webp',   'Female', 'Adult',  'Curvy',    'African',   4),
  ('Nora',   'models/m05-nora.webp',   'Female', 'Adult',  'Average',  'Latina',    5),
  ('Lena',   'models/m06-lena.webp',   'Female', 'Adult',  'Slim',     'Caucasian', 6),
  ('Ruby',   'models/m07-ruby.webp',   'Female', 'Adult',  'Average',  'Asian',     7),
  ('Sofia',  'models/m08-sofia.webp',  'Female', 'Adult',  'Curvy',    'Latina',    8),
  ('Elise',  'models/m09-elise.webp',  'Female', 'Adult',  'Slim',     'Caucasian', 9),
  ('Hana',   'models/m10-hana.webp',   'Female', 'Adult',  'Slim',     'Asian',     10),
  ('Amara',  'models/m11-amara.webp',  'Female', 'Adult',  'Curvy',    'African',   11),
  ('Clara',  'models/m12-clara.webp',  'Female', 'Adult',  'Average',  'Caucasian', 12),
  ('Liam',   'models/m13-liam.webp',   'Male',   'Adult',  'Athletic', 'Caucasian', 13),
  ('Noah',   'models/m14-noah.webp',   'Male',   'Adult',  'Athletic', 'Latino',    14),
  ('Kai',    'models/m15-kai.webp',    'Male',   'Adult',  'Average',  'Asian',     15),
  ('Ethan',  'models/m16-ethan.webp',  'Male',   'Adult',  'Average',  'Caucasian', 16),
  ('Jonah',  'models/m17-jonah.webp',  'Male',   'Adult',  'Athletic', 'African',   17),
  ('Marco',  'models/m18-marco.webp',  'Male',   'Adult',  'Average',  'Latino',    18),
  ('Dean',   'models/m19-dean.webp',   'Male',   'Adult',  'Athletic', 'Caucasian', 19),
  ('Rio',    'models/m20-rio.webp',    'Male',   'Adult',  'Slim',     'Asian',     20),
  ('Lily',   'models/m21-lily.webp',   'Female', 'Kid',    'Slim',     'Caucasian', 21),
  ('Iris',   'models/m22-iris.webp',   'Female', 'Kid',    'Slim',     'Asian',     22),
  ('Poppy',  'models/m23-poppy.webp',  'Female', 'Kid',    'Slim',     'Latina',    23),
  ('Theo',   'models/m24-theo.webp',   'Male',   'Kid',    'Slim',     'Caucasian', 24),
  ('Diane',  'models/m25-diane.webp',  'Female', 'Senior', 'Average',  'Caucasian', 25),
  ('Margot', 'models/m26-margot.webp', 'Female', 'Senior', 'Average',  'Asian',     26)
on conflict do nothing;

insert into public.backgrounds (name, image_key, category, sort_order) values
  ('Seamless White',  'backgrounds/b01-seamless-white.webp',  'Studio',   1),
  ('Warm Sand',        'backgrounds/b02-warm-sand.webp',       'Studio',   2),
  ('Soft Grey',         'backgrounds/b03-soft-grey.webp',        'Studio',   3),
  ('Blush Cyclorama',    'backgrounds/b04-blush-cyclorama.webp',   'Studio',   4),
  ('Deep Charcoal',       'backgrounds/b05-deep-charcoal.webp',      'Studio',   5),
  ('Loft Window',    'backgrounds/b06-loft-window.webp',    'Indoor',   6),
  ('Marble Wall',     'backgrounds/b07-marble-wall.webp',     'Indoor',   7),
  ('Cafe Interior',    'backgrounds/b08-cafe-interior.webp',    'Indoor',   8),
  ('Boutique Rail',     'backgrounds/b09-boutique-rail.webp',     'Indoor',   9),
  ('Beach Sunset',   'backgrounds/b10-beach-sunset.webp',   'Outdoor',  10),
  ('Golden Field',    'backgrounds/b11-golden-field.webp',    'Outdoor',  11),
  ('Poolside',          'backgrounds/b12-poolside.webp',          'Outdoor',  12),
  ('Autumn Park',      'backgrounds/b13-autumn-park.webp',      'Outdoor',  13),
  ('City Street',     'backgrounds/b14-city-street.webp',     'Urban',    14),
  ('Neon Night',        'backgrounds/b15-neon-night.webp',        'Urban',    15),
  ('Brick Alley',      'backgrounds/b16-brick-alley.webp',      'Urban',    16),
  ('Subway Platform',  'backgrounds/b17-subway-platform.webp',  'Urban',    17),
  ('Mint Gradient',    'backgrounds/b18-mint-gradient.webp',    'Abstract', 18),
  ('Lilac Haze',        'backgrounds/b19-lilac-haze.webp',        'Abstract', 19),
  ('Sunset Fade',      'backgrounds/b20-sunset-fade.webp',      'Abstract', 20)
on conflict do nothing;
