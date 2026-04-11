-- AlterEnum
BEGIN;

-- Update existing records gracefully before changing type references to prevent lock faults
UPDATE "User" SET "role" = 'FACILITATOR' WHERE "role" = 'DEVELOPER';

-- Re-map enum gracefully dropping the DEVELOPER enum variant and locking in FACILITATOR
CREATE TYPE "Role_new" AS ENUM ('FACILITATOR', 'CLIENT');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENT';

COMMIT;
