ALTER TABLE "knowledge_files"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'READY',
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "extractedText" TEXT,
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "knowledge_files_tenantId_status_idx" ON "knowledge_files"("tenantId","status");
CREATE INDEX "knowledge_files_contentHash_idx" ON "knowledge_files"("contentHash");