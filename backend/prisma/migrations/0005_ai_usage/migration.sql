CREATE TABLE "ai_usage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "providerAccountId" TEXT,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DOUBLE PRECISION,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_tenantId_createdAt_idx" ON "ai_usage"("tenantId", "createdAt");
CREATE INDEX "ai_usage_tenantId_provider_createdAt_idx" ON "ai_usage"("tenantId", "provider", "createdAt");
CREATE INDEX "ai_usage_providerAccountId_createdAt_idx" ON "ai_usage"("providerAccountId", "createdAt");

ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "ai_provider_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
