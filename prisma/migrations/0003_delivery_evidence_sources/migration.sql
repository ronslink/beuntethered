-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('GITHUB', 'VERCEL', 'SUPABASE', 'DOMAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceSourceStatus" AS ENUM ('CONNECTED', 'PENDING_VERIFICATION', 'NEEDS_ATTENTION');

-- CreateTable
CREATE TABLE "ProjectEvidenceSource" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "type" "EvidenceSourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "status" "EvidenceSourceStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEvidenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectEvidenceSource_project_id_type_idx" ON "ProjectEvidenceSource"("project_id", "type");

-- CreateIndex
CREATE INDEX "ProjectEvidenceSource_created_by_id_created_at_idx" ON "ProjectEvidenceSource"("created_by_id", "created_at");

-- AddForeignKey
ALTER TABLE "ProjectEvidenceSource" ADD CONSTRAINT "ProjectEvidenceSource_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEvidenceSource" ADD CONSTRAINT "ProjectEvidenceSource_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
