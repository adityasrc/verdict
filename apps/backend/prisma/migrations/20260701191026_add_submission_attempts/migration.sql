
-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "publicUrl",
ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1;
