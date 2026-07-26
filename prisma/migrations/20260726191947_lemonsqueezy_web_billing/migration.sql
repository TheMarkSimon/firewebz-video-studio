-- AlterTable
ALTER TABLE "User" ADD COLUMN     "extraCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lsCustomerId" TEXT,
ADD COLUMN     "lsRenewsAt" TIMESTAMP(3),
ADD COLUMN     "lsSubscriptionId" TEXT,
ADD COLUMN     "lsSubscriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "LsOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LsOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LsOrder_userId_idx" ON "LsOrder"("userId");

-- AddForeignKey
ALTER TABLE "LsOrder" ADD CONSTRAINT "LsOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
