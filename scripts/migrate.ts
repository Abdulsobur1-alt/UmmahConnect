import dotenv from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to apply migrations");

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql`create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )`;

    const directory = join(process.cwd(), "drizzle");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    const applied = new Set((await sql<{ id: string }[]>`select id from schema_migrations`).map((row) => row.id));

    for (const file of files) {
      if (applied.has(file)) continue;
      const migration = await readFile(join(directory, file), "utf8");
      await sql.unsafe(migration);
      await sql`insert into schema_migrations (id) values (${file})`;
      console.log(JSON.stringify({ event: "migration_applied", migration: file }));
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "migration_failed", message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
