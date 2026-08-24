-- Phase 1 + Phase 2 schema simplification
-- Removes: otp, requireUniqueId, studentUniqueId, status (FormStatus), attemptNumber
-- Replaces: compound unique [studentId, assignmentId, attemptNumber] → simple unique [studentId, assignmentId]

-- Drop the compound unique index involving attemptNumber
DROP INDEX IF EXISTS "submissions_studentId_assignmentId_attemptNumber_key";

-- Remove attemptNumber from submissions
ALTER TABLE "submissions" DROP COLUMN IF EXISTS "attemptNumber";

-- Remove studentUniqueId from submissions
ALTER TABLE "submissions" DROP COLUMN IF EXISTS "studentUniqueId";

-- Remove otp, requireUniqueId, status from assignments
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "otp";
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "requireUniqueId";
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "status";

-- Add the new simple unique constraint: one submission per student per assignment
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_studentId_assignmentId_key" UNIQUE ("studentId", "assignmentId");

-- Drop the now-unused FormStatus enum
DROP TYPE IF EXISTS "FormStatus";
