-- AlterTable campaigns
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "adCreatives" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "adCreativesGeneratedAt" TIMESTAMP(3);
