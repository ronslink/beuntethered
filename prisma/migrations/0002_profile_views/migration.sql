-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "facilitator_id" TEXT NOT NULL,
    "viewer_id" TEXT,
    "viewer_role" "Role",
    "source" TEXT NOT NULL DEFAULT 'facilitator_profile',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileView_facilitator_id_created_at_idx" ON "ProfileView"("facilitator_id", "created_at");

-- CreateIndex
CREATE INDEX "ProfileView_viewer_id_created_at_idx" ON "ProfileView"("viewer_id", "created_at");

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
