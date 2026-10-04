-- AlterTable rooms
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rooms_tenantId_clientId_idx" ON "rooms"("tenantId", "clientId");
CREATE INDEX IF NOT EXISTS "rooms_tenantId_campaignId_idx" ON "rooms"("tenantId", "campaignId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_clientId_fkey'
  ) THEN
    ALTER TABLE "rooms" ADD CONSTRAINT "rooms_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_campaignId_fkey'
  ) THEN
    ALTER TABLE "rooms" ADD CONSTRAINT "rooms_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
