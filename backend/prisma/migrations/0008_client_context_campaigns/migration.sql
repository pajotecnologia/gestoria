-- Client/Company Context
CREATE TABLE "clients" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "document" TEXT,
  "segment" TEXT,
  "website" TEXT,
  "instagram" TEXT,
  "linkedin" TEXT,
  "description" TEXT,
  "targetAudience" TEXT,
  "productsOffers" TEXT,
  "brandVoice" TEXT,
  "goals" TEXT,
  "competitors" TEXT,
  "restrictions" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_resources" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'WEBSITE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "agentId" TEXT,
  "name" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "offer" TEXT,
  "audience" TEXT,
  "channels" TEXT,
  "budget" TEXT,
  "period" TEXT,
  "brief" TEXT,
  "strategy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "knowledge_files" ALTER COLUMN "agentId" DROP NOT NULL;
ALTER TABLE "knowledge_files" ADD COLUMN "clientId" TEXT;

CREATE INDEX "clients_tenantId_status_idx" ON "clients"("tenantId", "status");
CREATE INDEX "clients_tenantId_name_idx" ON "clients"("tenantId", "name");
CREATE INDEX "client_resources_tenantId_clientId_idx" ON "client_resources"("tenantId", "clientId");
CREATE INDEX "campaigns_tenantId_clientId_status_idx" ON "campaigns"("tenantId", "clientId", "status");
CREATE INDEX "campaigns_tenantId_createdAt_idx" ON "campaigns"("tenantId", "createdAt");
CREATE INDEX "knowledge_files_tenantId_clientId_idx" ON "knowledge_files"("tenantId", "clientId");

ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_resources" ADD CONSTRAINT "client_resources_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_resources" ADD CONSTRAINT "client_resources_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
