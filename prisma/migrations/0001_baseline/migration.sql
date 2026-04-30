-- Baseline migration: live Supabase DB state as of 2026-04-12
DO $$
DECLARE
  extension_name text;
BEGIN
  FOREACH extension_name IN ARRAY ARRAY[
    'pg_graphql',
    'pg_stat_statements',
    'pgcrypto',
    'supabase_vault',
    'uuid-ossp',
    'vector'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_available_extensions
      WHERE name = extension_name
    ) THEN
      BEGIN
        EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I', extension_name);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping optional extension %: %', extension_name, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Skipping optional extension % because it is not installed on this PostgreSQL server.', extension_name;
    END IF;
  END LOOP;
END $$;
CREATE TYPE "Role" AS ENUM ('CLIENT', 'FACILITATOR');
CREATE TYPE "ProjectStatus" AS ENUM ('OPEN', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED');
CREATE TYPE "BillingType" AS ENUM ('FIXED_PRICE', 'HOURLY_RETAINER', 'HOURLY_NO_RETAINER');
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'FUNDED_IN_ESCROW', 'SUBMITTED_FOR_REVIEW', 'APPROVED_AND_PAID', 'DISPUTED');
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INVOICED');
CREATE TYPE "BidStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "ChangeOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PlatformTier" AS ENUM ('STANDARD', 'PRO', 'ELITE');
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BYOC_PRO');
