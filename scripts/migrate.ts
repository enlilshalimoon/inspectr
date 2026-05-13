// Apply every SQL file in db/migrations/ in lexical order against SUPABASE_DB_URL.
// Each file runs once; we track applied filenames in a tiny `_migrations` table.
//
// Usage:
//   npx tsx scripts/migrate.ts
//
// Requires SUPABASE_DB_URL in .env.local (postgres connection string).

import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = resolve(process.cwd(), "db/migrations");

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("SUPABASE_DB_URL is missing from .env.local");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public._migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const { rows: applied } = await client.query<{ filename: string }>(
      "select filename from public._migrations",
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`= skip   ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`+ apply  ${file}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public._migrations(filename) values ($1)", [file]);
        await client.query("commit");
        console.log(`  ok     ${file}`);
      } catch (err) {
        await client.query("rollback");
        console.error(`  FAIL   ${file}`);
        throw err;
      }
    }

    console.log("\nAll migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
