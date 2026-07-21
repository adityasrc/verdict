/*
  Warnings:

  - A unique constraint covering the columns `[studentId,assignmentId,attemptNumber]` on the table `submissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "submissions_studentId_assignmentId_attemptNumber_key" ON "submissions"("studentId", "assignmentId", "attemptNumber");
