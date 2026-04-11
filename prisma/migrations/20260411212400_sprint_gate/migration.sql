-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'DISPUTED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "unreviewed_hours_limit" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hourly_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "facilitator_id" TEXT NOT NULL,
    "hours" DECIMAL(65,30) NOT NULL,
    "proof_url" TEXT,
    "proof_description" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
