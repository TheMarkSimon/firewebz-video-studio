-- AlterTable
ALTER TABLE "ShopifyConnection" ADD COLUMN     "subscriptionGid" TEXT,
ADD COLUMN     "subscriptionName" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "subscriptionTest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subscriptionUpdatedAt" TIMESTAMP(3);
