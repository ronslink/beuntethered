-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_developer_id_fkey";

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "facilitator_id" TEXT;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "developer_id";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expertise_embedding" vector(1536);

-- CreateTable
CREATE TABLE "SquadProposal" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "pitch_to_client" TEXT NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "SquadProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadMember" (
    "id" TEXT NOT NULL,
    "squad_proposal_id" TEXT NOT NULL,
    "facilitator_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,

    CONSTRAINT "SquadMember_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadProposal" ADD CONSTRAINT "SquadProposal_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_squad_proposal_id_fkey" FOREIGN KEY ("squad_proposal_id") REFERENCES "SquadProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
