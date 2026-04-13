import { Client } from "pg";
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  await client.query(`
    ALTER TABLE "Bid"
      ADD COLUMN IF NOT EXISTS "required_escrow_pct" INT NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS "counter_escrow_pct"  INT;
  `);
  console.log("✓ Escrow negotiation columns added to Bid");
  await client.end();
}
run().catch(e => { console.error(e); process.exit(1); });
