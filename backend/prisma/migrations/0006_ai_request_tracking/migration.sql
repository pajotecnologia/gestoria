CREATE TABLE "ai_requests" ("id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"taskType" TEXT NOT NULL,"success" BOOLEAN NOT NULL DEFAULT false,"provider" TEXT,"model" TEXT,"totalTokens" INTEGER NOT NULL DEFAULT 0,"estimatedCost" DOUBLE PRECISION,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ai_requests_tenantId_createdAt_idx" ON "ai_requests"("tenantId","createdAt");
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage" ADD COLUMN "requestId" TEXT;
CREATE INDEX "ai_usage_requestId_idx" ON "ai_usage"("requestId");
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ai_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;