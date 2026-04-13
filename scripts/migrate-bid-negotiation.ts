/**
 * Migration: Bid Negotiation Lifecycle
 * Adds negotiation fields to Bid, new BidStatus values, active_bid_id to Project
 * Run directly against Supabase via pg driver (same as seed approach)
 */
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  await client.connect();
  console.log("✓ Connected to Supabase");

  await client.query(`
    -- 1. Add new BidStatus enum values (Postgres requires separate ALTER commands)
    DO $$ BEGIN
      ALTER TYPE "BidStatus" ADD VALUE IF NOT EXISTS 'SHORTLISTED';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TYPE "BidStatus" ADD VALUE IF NOT EXISTS 'UNDER_NEGOTIATION';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("✓ BidStatus enum extended");

  await client.query(`
    -- 2. Add negotiation fields to Bid table
    ALTER TABLE "Bid"
      ADD COLUMN IF NOT EXISTS "proposed_tech_stack" TEXT,
      ADD COLUMN IF NOT EXISTS "tech_stack_reason"   TEXT,
      ADD COLUMN IF NOT EXISTS "proposed_milestones" JSONB,
      ADD COLUMN IF NOT EXISTS "ai_score_card"       JSONB,
      ADD COLUMN IF NOT EXISTS "last_action_by"      TEXT,
      ADD COLUMN IF NOT EXISTS "counter_amount"      DECIMAL,
      ADD COLUMN IF NOT EXISTS "counter_reason"      TEXT,
      ADD COLUMN IF NOT EXISTS "counter_milestones"  JSONB,
      ADD COLUMN IF NOT EXISTS "negotiation_rounds"  INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "created_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updated_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
  `);
  console.log("✓ Bid negotiation columns added");

  await client.query(`
    -- 3. Auto-update updated_at trigger on Bid
    CREATE OR REPLACE FUNCTION update_bid_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS bid_updated_at_trigger ON "Bid";
    CREATE TRIGGER bid_updated_at_trigger
      BEFORE UPDATE ON "Bid"
      FOR EACH ROW EXECUTE FUNCTION update_bid_updated_at();
  `);
  console.log("✓ updated_at trigger created on Bid");

  await client.query(`
    -- 4. Add active_bid_id to Project (exclusive negotiation lock)
    ALTER TABLE "Project"
      ADD COLUMN IF NOT EXISTS "active_bid_id" TEXT;
  `);
  console.log("✓ Project.active_bid_id added");

  await client.end();
  console.log("\n✅ Migration complete — Bid Negotiation Lifecycle is live.");
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
