/**
 * Read-only check of public.catalogue_analysis after 0009 + 0010:  node scripts/verify-analysis.mjs
 * Prints counts and a few spot checks. Writes nothing and never prints the connection string.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await client.connect();
const one = async (sql) => (await client.query(sql)).rows;

const [{ total }] = await one("select count(*)::int as total from public.catalogue_analysis");
console.log("rows in catalogue_analysis:", total, "(expected 572)");
const kinds = await one(`
  select case when background_id is not null then 'background' when model_id is not null then 'model' else 'jewellery ' || category end as kind, count(*)::int as n
  from public.catalogue_analysis group by 1 order by 1`);
for (const r of kinds) console.log("  ", r.kind.padEnd(20), r.n);

const unmatched = await one(`
  select 'backgrounds without analysis' as what, count(*)::int as n from public.backgrounds b where not exists (select 1 from public.catalogue_analysis a where a.background_id = b.id)
  union all select 'models without analysis', count(*)::int from public.models m where not exists (select 1 from public.catalogue_analysis a where a.model_id = m.id)
  union all select 'jewellery without analysis', count(*)::int from public.jewellery j where not exists (select 1 from public.catalogue_analysis a where a.jewellery_id = j.id)`);
for (const r of unmatched) console.log("  ", r.what.padEnd(30), r.n);

const spot = await one(`
  select 'Background 250' as item, a.drive_id, left(a.analysis->>'name', 70) as name from public.catalogue_analysis a join public.backgrounds b on b.id = a.background_id where b.name = 'Background 250'
  union all select 'Model 30', a.drive_id, a.analysis->>'look' from public.catalogue_analysis a join public.models m on m.id = a.model_id where m.name = 'Model 30'
  union all select 'Saree Jewellery 25', a.drive_id, left(a.analysis->>'name', 70) from public.catalogue_analysis a join public.jewellery j on j.id = a.jewellery_id where j.category = 'Saree' and j.name = 'Jewellery 25'
  union all select 'Saree Jewellery 34', a.drive_id, left(a.analysis->>'name', 70) from public.catalogue_analysis a join public.jewellery j on j.id = a.jewellery_id where j.category = 'Saree' and j.name = 'Jewellery 34'
  union all select 'Lehenga Jewellery 12', a.drive_id, left(a.analysis->>'name', 70) from public.catalogue_analysis a join public.jewellery j on j.id = a.jewellery_id where j.category = 'Lehenga' and j.name = 'Jewellery 12'
  union all select 'Kurti Jewellery 74', a.drive_id, left(a.analysis->>'name', 70) from public.catalogue_analysis a join public.jewellery j on j.id = a.jewellery_id where j.category = 'Kurti' and j.name = 'Jewellery 74'`);
console.log("spot checks:");
for (const r of spot) console.log("  ", r.item.padEnd(22), String(r.drive_id).padEnd(12), r.name);

const [priv] = await one(`select has_table_privilege('anon', 'public.catalogue_analysis', 'select') as anon_can_read,
  has_table_privilege('authenticated', 'public.catalogue_analysis', 'select') as authenticated_can_read,
  (select relrowsecurity from pg_class where oid = 'public.catalogue_analysis'::regclass) as rls_on`);
console.log("privacy:", priv);
const [{ applied }] = await one("select string_agg(filename, ', ' order by filename) as applied from schema_migrations where filename like '0009%' or filename like '0010%' or filename like '0011%'");
console.log("recorded as applied:", applied);

// the recommendation reference tables (0011, filled by scripts/import-reference.mjs)
const ref = await one(`
  select (select count(*)::int from public.reference_photoshoots) as photoshoots,
         (select count(*)::int from public.reference_nearest where kind = 'background') as nearest_backgrounds,
         (select count(*)::int from public.reference_nearest where kind = 'jewellery') as nearest_jewellery`);
console.log("reference tables:", ref[0]);
const [refPriv] = await one(`select has_table_privilege('anon', 'public.reference_nearest', 'select') as anon_nearest,
  has_table_privilege('anon', 'public.reference_photoshoots', 'select') as anon_photoshoots,
  (select relrowsecurity from pg_class where oid = 'public.reference_nearest'::regclass) as rls_nearest,
  (select relrowsecurity from pg_class where oid = 'public.reference_photoshoots'::regclass) as rls_photoshoots`);
console.log("reference privacy:", refPriv);
await client.end();
