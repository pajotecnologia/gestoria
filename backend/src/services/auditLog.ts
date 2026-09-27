import { prisma } from '../routes/authRoutes';

export async function writeAuditLog(params: {
  tenantId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId || null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId || null,
      metadata: (params.metadata || {}) as any,
    },
  });
}
