
-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubmissionStatus" ADD VALUE 'EVALUATING';
ALTER TYPE "SubmissionStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "status" "FormStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "public_url",
ADD COLUMN     "fileKey" TEXT NOT NULL,
ADD COLUMN     "publicUrl" TEXT NOT NULL,
DROP COLUMN "feedback",
ADD COLUMN     "feedback" JSONB;

-- CreateIndex
CREATE INDEX "assignments_teacherId_idx" ON "assignments"("teacherId");

-- CreateIndex
CREATE INDEX "rubrics_teacherId_idx" ON "rubrics"("teacherId");

-- CreateIndex
CREATE INDEX "submissions_studentId_idx" ON "submissions"("studentId");

-- CreateIndex
CREATE INDEX "submissions_assignmentId_idx" ON "submissions"("assignmentId");
