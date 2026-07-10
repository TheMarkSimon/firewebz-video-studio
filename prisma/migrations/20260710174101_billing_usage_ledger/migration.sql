-- AlterTable
ALTER TABLE "ShopifyConnection" ADD COLUMN     "usageLineItemGid" TEXT;

-- CreateTable
CREATE TABLE "SpinUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spinId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "counted" BOOLEAN NOT NULL DEFAULT true,
    "usageRecordGid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpinUsage_userId_kind_counted_createdAt_idx" ON "SpinUsage"("userId", "kind", "counted", "createdAt");

-- CreateIndex
CREATE INDEX "SpinUsage_spinId_createdAt_idx" ON "SpinUsage"("spinId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "SpinUsage" ADD CONSTRAINT "SpinUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
