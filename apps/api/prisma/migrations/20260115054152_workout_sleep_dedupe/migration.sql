/*
  Warnings:

  - A unique constraint covering the columns `[dedupe_key]` on the table `sleep_sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source_id]` on the table `workouts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sleep_sessions" ADD COLUMN     "dedupe_key" TEXT;

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "source_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sleep_sessions_dedupe_key_key" ON "sleep_sessions"("dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "workouts_source_id_key" ON "workouts"("source_id");
