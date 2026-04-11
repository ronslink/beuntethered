-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_client_id_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "creator_id" TEXT NOT NULL DEFAULT 'SYSTEM_PLACEHOLDER',
ADD COLUMN     "invite_token" TEXT,
ALTER COLUMN "client_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_invite_token_key" ON "Project"("invite_token");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
