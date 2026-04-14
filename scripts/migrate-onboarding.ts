import { Client } from "pg";

const c = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await c.connect();
  console.log("Connected. Running onboarding migration...");

  await c.query(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "google_key_encrypted"    TEXT,
      ADD COLUMN IF NOT EXISTS "onboarding_complete"     BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "tos_accepted_at"         TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "tos_version"             TEXT,
      ADD COLUMN IF NOT EXISTS "address_line1"           TEXT,
      ADD COLUMN IF NOT EXISTS "address_city"            TEXT,
      ADD COLUMN IF NOT EXISTS "address_state"           TEXT,
      ADD COLUMN IF NOT EXISTS "address_zip"             TEXT,
      ADD COLUMN IF NOT EXISTS "address_country"         TEXT NOT NULL DEFAULT 'US',
      ADD COLUMN IF NOT EXISTS "bio"                     TEXT,
      ADD COLUMN IF NOT EXISTS "skills"                  TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "ai_agent_stack"          TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "portfolio_url"           TEXT,
      ADD COLUMN IF NOT EXISTS "availability"            TEXT,
      ADD COLUMN IF NOT EXISTS "years_experience"        INTEGER,
      ADD COLUMN IF NOT EXISTS "preferred_project_size"  TEXT,
      ADD COLUMN IF NOT EXISTS "company_name"            TEXT,
      ADD COLUMN IF NOT EXISTS "company_type"            TEXT,
      ADD COLUMN IF NOT EXISTS "preferred_bid_type"      TEXT,
      ADD COLUMN IF NOT EXISTS "typical_project_budget"  TEXT;
  `);
  console.log("✓ Columns added.");

  // Mark all existing users as onboarding complete — avoids disrupting active accounts
  const { rowCount } = await c.query(`
    UPDATE "User" SET "onboarding_complete" = true WHERE "onboarding_complete" = false
  `);
  console.log(`✓ Marked ${rowCount} existing user(s) as onboarding_complete = true.`);

  await c.end();
  console.log("Migration complete.");
}

run().catch((e) => { console.error(e); process.exit(1); });
