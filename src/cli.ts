#!/usr/bin/env node
import { cac } from "cac";
import fs from "node:fs";
import path from "node:path";
import { sql, sqlRaw } from "./sql.js";

const MIGRATIONS_DIR = path.resolve("migrations");

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

const cli = cac("hanlec");

cli
  .command("migration:new <name>", "Create a new migration file")
  .action((name: string) => {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    const timestamp = Date.now();
    const slug = name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    const filename = `${timestamp}_${slug}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);
    fs.writeFileSync(filepath, "", "utf-8");
    console.log(`Created ${filepath}`);
  });

cli.command("migrate", "Run pending migrations").action(async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS hanlec_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql<{ name: string }>`SELECT name FROM hanlec_migrations`).map(
      (r) => r.name,
    ),
  );

  const pending = getMigrationFiles().filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const file of pending) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Applying ${file}...`);
    await sqlRaw(content);
    await sql`INSERT INTO hanlec_migrations (name) VALUES (${file})`;
  }

  console.log(`Applied ${pending.length} migration(s).`);
});

cli.help();
cli.parse();
