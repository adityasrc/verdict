-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropIndex
DROP INDEX IF EXISTS "submissions_studentId_idx";

-- DropIndex
DROP INDEX IF EXISTS "submissions_assignmentId_idx";

-- CreateIndex
CREATE INDEX "assignments_rubricId_idx" ON "assignments"("rubricId");

-- CreateIndex
CREATE INDEX "submissions_studentId_submittedAt_idx" ON "submissions"("studentId", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "submissions_assignmentId_submittedAt_idx" ON "submissions"("assignmentId", "submittedAt" DESC);
