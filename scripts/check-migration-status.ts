import { Client } from "pg";
import "dotenv/config";
import * as fs from "fs";

const c = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await c.connect();
  console.log("Connected.\n");

  // Get all tables
  const tables = await c.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log("=== Existing Tables ===");
  const tableNames = tables.rows.map((r: any) => r.table_name);
  tableNames.forEach((t: string) => console.log(`  ${t}`));

  // Get all columns per table
  const allCols = await c.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const dbSchema: Record<string, string[]> = {};
  for (const row of allCols.rows) {
    if (!dbSchema[row.table_name]) dbSchema[row.table_name] = [];
    dbSchema[row.table_name].push(row.column_name);
  }

  // Parse Prisma schema for expected models and fields
  const schema = fs.readFileSync("prisma/schema.prisma", "utf-8");
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  const prismaModels: Record<string, string[]> = {};

  let match;
  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields: string[] = [];

    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) continue;
      // Field lines: fieldName Type ...
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        // Skip relation fields (they don't have DB columns)
        if (trimmed.includes("@relation(")) continue;
        // Skip array relations (Type[])
        if (/\w+\s+\w+\[\]/.test(trimmed)) continue;
        fields.push(fieldName);
      }
    }
    prismaModels[modelName] = fields;
  }

  // Compare
  console.log("\n=== Schema vs Database Comparison ===\n");

  const expectedTables = Object.keys(prismaModels);
  const missingTables = expectedTables.filter((t) => !tableNames.includes(t));
  if (missingTables.length > 0) {
    console.log("MISSING TABLES:");
    missingTables.forEach((t) => console.log(`  ❌ ${t}`));
  }

  let allGood = true;
  for (const [model, fields] of Object.entries(prismaModels)) {
    if (!dbSchema[model]) {
      console.log(`\n❌ TABLE "${model}" — does not exist in database`);
      console.log(`   Expected columns: ${fields.join(", ")}`);
      allGood = false;
      continue;
    }

    const dbCols = dbSchema[model];
    const missingCols = fields.filter((f) => !dbCols.includes(f));
    const extraDbCols = dbCols.filter((col) => !fields.includes(col));

    if (missingCols.length > 0) {
      console.log(`\n⚠️  TABLE "${model}" — missing columns:`);
      missingCols.forEach((col) => console.log(`   ❌ ${col}`));
      allGood = false;
    }

    if (extraDbCols.length > 0) {
      console.log(`\n📎 TABLE "${model}" — extra DB columns (not in schema):`);
      extraDbCols.forEach((col) => console.log(`   ➕ ${col}`));
    }
  }

  // Check for DB tables not in Prisma
  const extraTables = tableNames.filter(
    (t: string) => !expectedTables.includes(t) && !t.startsWith("_prisma") && t !== "_prisma_migrations"
  );
  if (extraTables.length > 0) {
    console.log("\n📎 Extra DB tables (not in Prisma schema):");
    extraTables.forEach((t: string) => console.log(`   ➕ ${t}`));
  }

  if (allGood) {
    console.log("\n✅ All Prisma models and fields exist in the database.");
  }

  // Get all enums
  const enums = await c.query(`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `);
  const dbEnums: Record<string, string[]> = {};
  for (const row of enums.rows) {
    if (!dbEnums[row.enum_name]) dbEnums[row.enum_name] = [];
    dbEnums[row.enum_name].push(row.enum_value);
  }

  // Parse Prisma enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  const prismaEnums: Record<string, string[]> = {};
  while ((match = enumRegex.exec(schema)) !== null) {
    const enumName = match[1];
    const values = match[2].split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//"));
    prismaEnums[enumName] = values;
  }

  console.log("\n=== Enum Comparison ===\n");
  let enumsGood = true;
  for (const [enumName, values] of Object.entries(prismaEnums)) {
    const dbValues = dbEnums[enumName];
    if (!dbValues) {
      console.log(`❌ ENUM "${enumName}" — does not exist in database`);
      console.log(`   Expected values: ${values.join(", ")}`);
      enumsGood = false;
      continue;
    }
    const missingValues = values.filter((v) => !dbValues.includes(v));
    if (missingValues.length > 0) {
      console.log(`⚠️  ENUM "${enumName}" — missing values: ${missingValues.join(", ")}`);
      enumsGood = false;
    }
  }
  if (enumsGood) {
    console.log("✅ All Prisma enums and values exist in the database.");
  }

  await c.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
