-- Campaign lifecycle: activation flag and execution period
ALTER TABLE "campaigns"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "endDate" TIMESTAMP(3);

CREATE INDEX "campaigns_tenantId_clientId_isActive_idx"
  ON "campaigns"("tenantId", "clientId", "isActive");

CREATE INDEX "campaigns_tenantId_startDate_endDate_idx"
  ON "campaigns"("tenantId", "startDate", "endDate");
