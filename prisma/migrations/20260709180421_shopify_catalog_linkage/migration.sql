-- AlterTable
ALTER TABLE "Spin" ADD COLUMN     "pushedToShopifyAt" TIMESTAMP(3),
ADD COLUMN     "shopifyProductGid" TEXT,
ADD COLUMN     "shopifyProductHandle" TEXT;
