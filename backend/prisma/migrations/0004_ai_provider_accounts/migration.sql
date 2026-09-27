CREATE TABLE "ai_provider_accounts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "encryptedKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "lastError" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_provider_accounts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_provider_accounts_tenantId_enabled_priority_idx" ON "ai_provider_accounts"("tenantId", "enabled", "priority");
ALTER TABLE "ai_provider_accounts" ADD CONSTRAINT "ai_provider_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
