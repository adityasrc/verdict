
-- CreateIndex
CREATE UNIQUE INDEX "submissions_studentId_assignmentId_attemptNumber_key" ON "submissions"("studentId", "assignmentId", "attemptNumber");
