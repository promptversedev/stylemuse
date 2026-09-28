/**
 * SQL migration runner.
 *
 * Applies supabase/migrations/*.sql in filename order, tracking what has run in
 * schema_migrations. Each migration runs inside a transaction, so a failure
 * leaves nothing half-applied.
 *
 * This exists because the Supabase REST API cannot run DDL — it exposes tables
 * and RPCs, not arbitrary SQL — so a service-role key is no help here. A direct
 * Postgres connection is what migrations need, which is why DATABASE_URL is a
 * separate variable from the SUPABASE_* ones.
 *
 * Usage: npm run db:migrate
 */
import { config as loadEnv } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

// `.env.local` first, because that is where this project keeps its values —
// Next's convention, and not what `dotenv/config` would have picked up.
loadEnv({ path: ".env.local" });
loadEnv();

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
/** Arbitrary app-wide lock id, so two runners cannot apply the same file. */
const LOCK_KEY = 727_002;

function connectionString(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  throw new Error(
    "DATABASE_URL is not set.\n\n" +
      "Supabase dashboard → Project Settings → Database → Connection string → URI.\n" +
      "Use the Session pooler (port 5432) rather than the transaction pooler:\n" +
      "DDL and advisory locks need a session-mode connection.\n\n" +
      "Then put it in .env.local:\n" +
      '  DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>:5432/postgres"',
  );
}

async function main() {
  const client = new Client({
    connectionString: connectionString(),
    // Supabase terminates TLS with a cert this chain does not carry, and the
    // connection is to a known host over the public internet either way.
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query("SELECT filename FROM schema_migrations")).rows.map(
        (r: { filename: string }) => r.filename,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying ${file}...`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        ran += 1;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`${file} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(ran ? `Applied ${ran} migration(s).` : "Already up to date.");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
