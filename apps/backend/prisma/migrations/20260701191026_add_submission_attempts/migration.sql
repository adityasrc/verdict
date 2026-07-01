/*
  Warnings:

  - You are about to drop the column `publicUrl` on the `submissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "publicUrl",
ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1;
