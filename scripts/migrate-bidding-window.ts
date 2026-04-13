import { Client } from "pg";
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  await client.query(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "bidding_closes_at" TIMESTAMP WITH TIME ZONE`);
  console.log("✓ bidding_closes_at column added to Project");
  await client.end();
  console.log("✅ Done");
}
run().catch(e => { console.error(e); process.exit(1); });
