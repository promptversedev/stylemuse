/**
 * Imports the recommendation reference data into public.reference_photoshoots / public.reference_nearest (created in 0011).
 *
 *   node scripts/import-reference.mjs <folder with the three export files> [--dry-run]
 *
 * The folder is what the Colab notebook qwen_reference_export_colab.ipynb writes (and downloads):
 *   reference_photoshoots.jsonl, reference_nearest.jsonl, manifest.json
 *
 * Everything happens in ONE transaction and REPLACES what was there: the old rows are deleted, the new ones inserted, and if anything
 * is wrong (an item the catalogue does not have, a count that differs from the manifest) it rolls back and the old data stays.
 * `--dry-run` does all of it and rolls back at the end, so you can see the result without changing anything.
 *
 * The nearest items are named by their id in the analysis files ("250", "J36"); they are turned into catalogue ids through
 * public.catalogue_analysis (0009 + 0010), by drive_id (and category for jewellery).
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BATCH = 400;
const readLines = (file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

/** `client` only needs `.query(text, params)`: a pg Client, or anything shaped like one (the tests use PGlite). */
export async function importReference(client, folder, { dryRun = false, log = console.log } = {}) {
  const manifest = JSON.parse(readFileSync(path.join(folder, "manifest.json"), "utf8"));
  const photoshoots = readLines(path.join(folder, "reference_photoshoots.jsonl"));
  const nearest = readLines(path.join(folder, "reference_nearest.jsonl"));
  log(`read ${photoshoots.length} photoshoots and ${nearest.length} nearest rows (made ${manifest.made_at}, keep ${manifest.keep})`);

  if (photoshoots.length !== manifest.photoshoots || nearest.length !== manifest.nearest_rows) {
    throw new Error("The files do not match manifest.json (a download that stopped early?). Nothing was changed.");
  }
  const ids = new Set(photoshoots.map((p) => p.id));
  if (ids.size !== photoshoots.length) throw new Error("Two photoshoots have the same id. Nothing was changed.");
  const stray = nearest.find((n) => !ids.has(n.photoshoot_id));
  if (stray) throw new Error(`reference_nearest names a photoshoot that is not in the list: ${stray.photoshoot_id}`);

  await client.query("begin");
  try {
    await client.query("delete from public.reference_photoshoots");          // cascades to reference_nearest
    for (let i = 0; i < photoshoots.length; i += BATCH) {
      await client.query(
        `insert into public.reference_photoshoots
           (id, brand, category_family, category, occasion, fabric, design_pattern, work_level,
            main_name, main_share, main_l, main_a, main_b, colours, skin_tone, body_type)
         select id, brand, category_family, category, occasion, fabric, design_pattern, work_level,
                main_name, main_share, main_l, main_a, main_b, colours, skin_tone, body_type
         from jsonb_to_recordset($1::jsonb) as x(
           id text, brand text, category_family text, category text, occasion text, fabric text, design_pattern text, work_level text,
           main_name text, main_share real, main_l real, main_a real, main_b real, colours jsonb, skin_tone text, body_type text)`,
        [JSON.stringify(photoshoots.slice(i, i + BATCH))],
      );
    }

    await client.query(
      `create temp table _near (photoshoot_id text not null, kind text not null, category text, rank integer not null, drive_id text not null, likeness real not null) on commit drop`,
    );
    for (let i = 0; i < nearest.length; i += BATCH * 10) {
      await client.query(
        `insert into _near select photoshoot_id, kind, category, rank, drive_id, likeness
         from jsonb_to_recordset($1::jsonb) as x(photoshoot_id text, kind text, category text, rank integer, drive_id text, likeness real)`,
        [JSON.stringify(nearest.slice(i, i + BATCH * 10))],
      );
    }

    const unresolved = (
      await client.query(
        `select n.kind, n.category, n.drive_id, count(*)::int as rows from _near n
         where (n.kind = 'background' and not exists (select 1 from public.catalogue_analysis a where a.background_id is not null and a.drive_id = n.drive_id))
            or (n.kind = 'jewellery'  and not exists (select 1 from public.catalogue_analysis a where a.jewellery_id  is not null and a.category = n.category and a.drive_id = n.drive_id))
         group by 1, 2, 3 order by 4 desc limit 10`,
      )
    ).rows;
    if (unresolved.length) {
      throw new Error(
        "These items are in the export but not in the catalogue (is 0010 applied? did the analysis ids change?): " +
          unresolved.map((u) => `${u.kind}${u.category ? " " + u.category : ""} ${u.drive_id} (${u.rows} rows)`).join(", "),
      );
    }

    await client.query(
      `insert into public.reference_nearest (photoshoot_id, kind, rank, background_id, jewellery_id, likeness)
       select n.photoshoot_id, n.kind, n.rank, a.background_id, a.jewellery_id, n.likeness
       from _near n
       join public.catalogue_analysis a
         on (n.kind = 'background' and a.background_id is not null and a.drive_id = n.drive_id)
         or (n.kind = 'jewellery'  and a.jewellery_id  is not null and a.category = n.category and a.drive_id = n.drive_id)`,
    );

    const [{ p, b, j }] = (
      await client.query(`select (select count(*) from public.reference_photoshoots)::int as p,
                                 (select count(*) from public.reference_nearest where kind = 'background')::int as b,
                                 (select count(*) from public.reference_nearest where kind = 'jewellery')::int as j`)
    ).rows;
    if (p !== manifest.photoshoots || b !== manifest.nearest_backgrounds || j !== manifest.nearest_jewellery) {
      throw new Error(`Counts after the import (${p} / ${b} / ${j}) differ from the manifest (${manifest.photoshoots} / ${manifest.nearest_backgrounds} / ${manifest.nearest_jewellery}).`);
    }
    log(`${dryRun ? "DRY RUN, nothing kept" : "imported"}: ${p} photoshoots, ${b} background rows, ${j} jewellery rows`);
    await client.query(dryRun ? "rollback" : "commit");
    return { photoshoots: p, backgrounds: b, jewellery: j, dryRun };
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith("--"));
  if (!folder) {
    console.error("Usage: node scripts/import-reference.mjs <folder with reference_photoshoots.jsonl, reference_nearest.jsonl, manifest.json> [--dry-run]");
    process.exit(1);
  }
  config({ path: ".env.local", quiet: true });
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15_000 });
  await client.connect();
  try {
    await importReference(client, path.resolve(folder), { dryRun: args.includes("--dry-run") });
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
