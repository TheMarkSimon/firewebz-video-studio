-- AlterTable
ALTER TABLE "Spin" ADD COLUMN     "falRequestId" TEXT,
ADD COLUMN     "generateStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Spin_falRequestId_idx" ON "Spin"("falRequestId");
