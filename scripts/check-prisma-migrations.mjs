import { Client } from "pg";
import nextEnv from "@next/env";
import fs from "node:fs";
import path from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const repoMigrations = fs.existsSync(migrationsDir)
  ? fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const table = await client.query(`
    SELECT to_regclass('public._prisma_migrations') AS table_name
  `);

  if (!table.rows[0]?.table_name) {
    console.log("No _prisma_migrations table exists yet.");
    console.log(`Repo migrations: ${repoMigrations.join(", ") || "(none)"}`);
    process.exit(0);
  }

  const result = await client.query(`
    SELECT migration_name, started_at, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations"
    ORDER BY started_at
  `);

  const rows = result.rows;
  const failed = rows.filter((row) => !row.finished_at && !row.rolled_back_at);
  const applied = rows.filter((row) => row.finished_at && !row.rolled_back_at).map((row) => row.migration_name);
  const stale = rows.filter((row) => !repoMigrations.includes(row.migration_name));
  const missing = repoMigrations.filter((name) => !applied.includes(name));
  const userTables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `);

  console.log("=== Prisma Migration State ===");
  console.log(`Repo migrations: ${repoMigrations.join(", ") || "(none)"}`);
  console.log(`Database rows: ${rows.length}`);
  console.log(`Applied: ${applied.join(", ") || "(none)"}`);
  console.log(`Pending from repo: ${missing.join(", ") || "(none)"}`);
  console.log(`User tables: ${userTables.rows.length}`);

  if (stale.length > 0) {
    console.log("\nStale database migration rows not present in this repo:");
    stale.forEach((row) => {
      const state = row.rolled_back_at ? "rolled back" : row.finished_at ? "applied" : "failed";
      console.log(`- ${row.migration_name} (${state})`);
    });
  }

  if (failed.length > 0) {
    console.log("\nFailed migrations blocking deploy:");
    failed.forEach((row) => {
      console.log(`- ${row.migration_name}`);
      if (row.logs) console.log(String(row.logs).slice(0, 1000));
      console.log(`  Recovery command: npx prisma migrate resolve --rolled-back ${row.migration_name}`);
    });
    process.exit(2);
  }

  if (missing.includes("0001_current_schema") && userTables.rows.length > 0) {
    console.log("\nExisting schema with pending current baseline detected.");
    console.log("Do not replay 0001_current_schema against a populated database.");
    console.log("After verifying the schema matches prisma/schema.prisma, mark the baseline as applied:");
    console.log("  npx prisma migrate resolve --applied 0001_current_schema");
  }

  console.log("\nNo failed Prisma migrations are blocking deploy.");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
