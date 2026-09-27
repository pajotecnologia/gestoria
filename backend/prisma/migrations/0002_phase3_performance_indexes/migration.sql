-- Fase 3: índices compostos para consultas multi-tenant e históricos paginados

CREATE INDEX "agents_tenantId_createdAt_idx" ON "agents"("tenantId", "createdAt");
CREATE INDEX "rooms_tenantId_updatedAt_idx" ON "rooms"("tenantId", "updatedAt");
CREATE INDEX "room_messages_roomId_createdAt_idx" ON "room_messages"("roomId", "createdAt");
