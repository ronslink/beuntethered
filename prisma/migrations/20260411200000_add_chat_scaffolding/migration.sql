-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "milestone_id" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
