import { Client } from "pg";
import "dotenv/config";

const c = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await c.connect();
  console.log("Connected. Adding notification preference columns...\n");

  const cols = [
    { name: "notify_payment_updates", type: "BOOLEAN NOT NULL DEFAULT true" },
    { name: "notify_new_proposals", type: "BOOLEAN NOT NULL DEFAULT false" },
    { name: "notify_milestone_reviews", type: "BOOLEAN NOT NULL DEFAULT true" },
  ];

  for (const col of cols) {
    const check = await c.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = $1`,
      [col.name]
    );
    if (check.rows.length > 0) {
      console.log(`  ✓ ${col.name} — already exists`);
    } else {
      await c.query(`ALTER TABLE "User" ADD COLUMN "${col.name}" ${col.type}`);
      console.log(`  ✅ ${col.name} — added`);
    }
  }

  console.log("\nDone.");
  await c.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
