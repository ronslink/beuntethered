-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('FIXED_MILESTONE', 'HOURLY_RETAINER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "billing_type" "BillingType" NOT NULL DEFAULT 'FIXED_MILESTONE',
ADD COLUMN "github_access_token" TEXT,
ADD COLUMN "github_repo_url" TEXT;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "ai_audit_report" JSONB;
