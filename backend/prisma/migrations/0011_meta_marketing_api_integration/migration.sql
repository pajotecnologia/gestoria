-- AlterTable clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "metaAdAccountId" TEXT;

-- AlterTable campaigns
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "metaAdAccountId" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "metaCampaignId" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "metaLastSyncAt" TIMESTAMP(3);
