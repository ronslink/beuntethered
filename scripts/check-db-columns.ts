import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await c.connect();

  // Check Bid columns
  const bidCols = await c.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'Bid'
    ORDER BY column_name
  `);
  console.log("\n=== BID COLUMNS ===");
  bidCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default ?? "none"})`));

  // Check Project columns
  const projCols = await c.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'Project'
    ORDER BY column_name
  `);
  console.log("\n=== PROJECT COLUMNS ===");
  projCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default ?? "none"})`));

  await c.end();
}
run().catch(e => { console.error(e); process.exit(1); });
