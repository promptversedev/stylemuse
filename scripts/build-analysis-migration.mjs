/**
 * Builds supabase/migrations/0010_catalogue_analysis_data.sql from the analysis folders.
 *
 *   node scripts/build-analysis-migration.mjs [--downloads "C:\Users\Dell\Downloads"] [--file 0010_catalogue_analysis_data.sql] [--check]
 *
 * Reads the analysed JSON of the five catalogue sets (the combined file, cross-checked against the one-file-per-item
 * folder next to it) and writes ONE migration that puts every record into public.catalogue_analysis (see 0009).
 * `--check` prints what it found and writes nothing. Run it again whenever the analysis changes; the migration is
 * safe to re-run (it upserts), but a changed file has to be a NEW migration number once 0010 has been applied.
 *
 * HOW A RECORD FINDS ITS CATALOGUE ROW. The analysis files name an item by the id of its picture; the catalogue names it
 * "Background 250", "Model 30", "Jewellery 12" (category Saree / Lehenga / Kurti). Checked picture by picture against the
 * live catalogue (every background, every lehenga and kurti jewellery, 12 of the models, all 53 saree jewellery):
 *
 *   background      id "250"        -> "Background 250"
 *   model           id "30"         -> "Model 30"
 *   lehenga jewel.  id "clean-12.J" -> "Jewellery 12", category Lehenga
 *   kurti jewel.    id "12"         -> "Jewellery 12", category Kurti
 *   saree jewel.    id "J36"        -> the 36th-ranked saree set: the catalogue numbers its 53 saree sets 1..53 with no gaps,
 *                                      while the files are J1..J55 without J25 and J35, so from J26 on the numbers differ.
 *                                      Rule: sort the files by their number; position k in that list is "Jewellery k".
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DOWNLOADS = option("--downloads", "C:\\Users\\Dell\\Downloads");
// After 0010 has been applied, a changed analysis must be a NEW migration: pass --file 0011_catalogue_analysis_data_2.sql
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations", option("--file", "0010_catalogue_analysis_data.sql"));

/** Each set: the download folder (its name starts with `prefix`, the rest is a timestamp), the folder inside it, the files. */
const SETS = [
  { label: "backgrounds", kind: "background", category: null, prefix: "Saree BG-", inner: "Saree BG", combined: "backgrounds.json", items: "stylemuse background", idKey: "background_id" },
  { label: "models", kind: "model", category: null, prefix: "model-original-400-", inner: "model-original-400", combined: "models.json", items: "stylemuse model", idKey: "model_id" },
  { label: "saree jewellery", kind: "jewellery", category: "Saree", prefix: "Jew-", inner: "Jew", combined: "styles.json", items: "stylemuse accessories", idKey: "style_id", numbering: "position" },
  { label: "lehenga jewellery", kind: "jewellery", category: "Lehenga", prefix: "lahenga jewellery 400-", inner: "lahenga jewellery 400", combined: "styles.json", items: "stylemuse lahenga accessories", idKey: "style_id" },
  { label: "kurti jewellery", kind: "jewellery", category: "Kurti", prefix: "kurti jew 400-", inner: "kurti jew 400", combined: "styles.json", items: "stylemuse kurti accessories", idKey: "style_id" },
];

const digits = (id) => {
  const m = /\d+/.exec(String(id));
  if (!m) throw new Error(`No number in the id ${JSON.stringify(id)}`);
  return Number(m[0]);
};

function folderOf(set) {
  const hit = readdirSync(DOWNLOADS).filter((n) => n.startsWith(set.prefix));
  if (hit.length !== 1) throw new Error(`${set.label}: expected one folder starting "${set.prefix}" in ${DOWNLOADS}, found ${hit.length}`);
  return path.join(DOWNLOADS, hit[0], set.inner);
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));

const staged = [];
const summary = [];
for (const set of SETS) {
  const dir = folderOf(set);
  const records = readJson(path.join(dir, set.combined));
  if (!Array.isArray(records)) throw new Error(`${set.label}: ${set.combined} is not a list`);

  // The one-file-per-item folder must say the same thing as the combined file.
  const perItem = new Map(
    readdirSync(path.join(dir, set.items))
      .filter((n) => n.endsWith(".json"))
      .map((n) => {
        const r = readJson(path.join(dir, set.items, n));
        return [String(r[set.idKey]), r];
      }),
  );
  let differ = 0;
  for (const r of records) {
    const other = perItem.get(String(r[set.idKey]));
    if (!other || JSON.stringify(other) !== JSON.stringify(r)) differ += 1;
  }
  if (perItem.size !== records.length || differ) {
    console.warn(`WARNING ${set.label}: combined file has ${records.length} records, item folder ${perItem.size}; ${differ} differ. The combined file is used.`);
  }

  const ordered = [...records].sort((a, b) => digits(a[set.idKey]) - digits(b[set.idKey]));
  ordered.forEach((record, index) => {
    const id = String(record[set.idKey]);
    const num = set.numbering === "position" ? index + 1 : digits(id);
    staged.push({ kind: set.kind, category: set.category, num, driveId: id, doc: record });
  });
  const seen = new Set();
  for (const s of staged.filter((x) => x.kind === set.kind && x.category === set.category)) {
    const key = `${s.num}`;
    if (seen.has(key)) throw new Error(`${set.label}: two records map to catalogue number ${key}`);
    seen.add(key);
  }
  summary.push(`${set.label.padEnd(18)} ${String(records.length).padStart(3)} records  (${path.relative(DOWNLOADS, dir)})`);
}
console.log(summary.join("\n"));
console.log(`total ${staged.length} records`);
if (flag("--check")) process.exit(0);

const TAG = "$an$";
const lit = (s) => (s === null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const rows = staged.map((s) => {
  const json = JSON.stringify(s.doc);
  if (json.includes(TAG)) throw new Error(`The record ${s.driveId} contains ${TAG}, which would end its SQL string early`);
  return ` (${lit(s.kind)}, ${lit(s.category)}, ${s.num}, ${lit(s.driveId)}, ${TAG}${json}${TAG}::jsonb)`;
});

const count = (kind, category = null) => staged.filter((s) => s.kind === kind && s.category === category).length;
const sql = `-- GENERATED by scripts/build-analysis-migration.mjs from the analysis folders. Do not edit by hand: change the source and run it again.
--
-- Puts the analysis of every catalogue picture into public.catalogue_analysis (created in 0009):
--   ${count("background")} backgrounds, ${count("model")} models, ${count("jewellery", "Saree")} saree + ${count("jewellery", "Lehenga")} lehenga + ${count("jewellery", "Kurti")} kurti jewellery sets.
--
-- A record is matched to its catalogue row by NAME, as the catalogue numbers its items:
--   background "250" -> name 'Background 250'        model "30" -> name 'Model 30'
--   jewellery  -> name 'Jewellery N' AND category 'Saree' | 'Lehenga' | 'Kurti'
--      lehenga "clean-12.J" -> N = 12      kurti "12" -> N = 12
--      saree: the catalogue numbers its 53 sets 1..53 with no gaps; the files are J1..J55 without J25 and J35, so J26.. are
--             shifted. N = the position of the file when the saree files are sorted by number (checked picture by picture).
--
-- It stops (and rolls everything back) if any record has no catalogue row. A catalogue row without a record is fine: it just
-- has no analysis yet (for example a model added after the analysis was made). Re-running updates the same rows.

create temp table _staged (
  kind      text not null,
  category  text,
  num       integer not null,
  drive_id  text not null,
  doc       jsonb not null
) on commit drop;

insert into _staged (kind, category, num, drive_id, doc) values
${rows.join(",\n")};

do $check$
declare
  missing text;
begin
  select string_agg(label, ', ' order by label) into missing
  from (
    select 'background ' || s.num as label from _staged s
      where s.kind = 'background' and not exists (select 1 from public.backgrounds b where b.name = 'Background ' || s.num)
    union all
    select 'model ' || s.num from _staged s
      where s.kind = 'model' and not exists (select 1 from public.models m where m.name = 'Model ' || s.num)
    union all
    select 'jewellery ' || s.category || ' ' || s.num from _staged s
      where s.kind = 'jewellery'
        and not exists (select 1 from public.jewellery j where j.name = 'Jewellery ' || s.num and j.category = s.category)
  ) t;
  if missing is not null then
    raise exception 'No catalogue row for these analysis records: %', missing;
  end if;
end
$check$;

insert into public.catalogue_analysis (background_id, drive_id, analysis)
select b.id, s.drive_id, s.doc
from _staged s
join public.backgrounds b on b.name = 'Background ' || s.num
where s.kind = 'background'
on conflict (background_id) where background_id is not null
do update set drive_id = excluded.drive_id, analysis = excluded.analysis, analysed_at = now();

insert into public.catalogue_analysis (model_id, drive_id, analysis)
select m.id, s.drive_id, s.doc
from _staged s
join public.models m on m.name = 'Model ' || s.num
where s.kind = 'model'
on conflict (model_id) where model_id is not null
do update set drive_id = excluded.drive_id, analysis = excluded.analysis, analysed_at = now();

insert into public.catalogue_analysis (jewellery_id, drive_id, category, analysis)
select j.id, s.drive_id, s.category, s.doc
from _staged s
join public.jewellery j on j.name = 'Jewellery ' || s.num and j.category = s.category
where s.kind = 'jewellery'
on conflict (jewellery_id) where jewellery_id is not null
do update set drive_id = excluded.drive_id, category = excluded.category, analysis = excluded.analysis, analysed_at = now();
`;
writeFileSync(OUT, sql, { encoding: "utf8" });
console.log(`wrote ${path.relative(process.cwd(), OUT)} (${(Buffer.byteLength(sql) / 1024).toFixed(0)} KB)`);
