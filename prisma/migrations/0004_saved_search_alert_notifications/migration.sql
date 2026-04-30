-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'MILESTONE', 'MESSAGE', 'BID', 'ALERT');

-- AlterTable
ALTER TABLE "SavedSearch" ADD COLUMN "last_alerted_at" TIMESTAMP(3);
ALTER TABLE "SavedSearch" ADD COLUMN "last_alert_match_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "href" TEXT,
    "read_at" TIMESTAMP(3),
    "source_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_source_key_key" ON "Notification"("source_key");

-- CreateIndex
CREATE INDEX "Notification_user_id_read_at_created_at_idx" ON "Notification"("user_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
