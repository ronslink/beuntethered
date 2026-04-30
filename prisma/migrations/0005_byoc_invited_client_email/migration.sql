ALTER TABLE "Project" ADD COLUMN "invited_client_email" TEXT;

CREATE INDEX "Project_invited_client_email_idx" ON "Project"("invited_client_email");
