import { PlanType } from '@prisma/client';
import { PLAN_LIMITS, PlanLimits } from '../config/planCatalog';

const MB = 1024 * 1024;
import { prisma } from '../routes/authRoutes';

export type PlanLimitKey = 'agents' | 'users' | 'rooms' | 'knowledgeBytes';

export class PlanLimitError extends Error {
  statusCode = 402;
  code = 'PLAN_LIMIT_REACHED';
  constructor(public resource: PlanLimitKey, public limit: number, public current: number) {
    super('Limite do plano atingido.');
  }
}

export async function getPlanLimits(tenantId: string): Promise<PlanLimits> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  return PLAN_LIMITS[tenant?.plan || 'TRIAL'];
}

export async function assertPlanCapacity(
  tenantId: string,
  resource: PlanLimitKey,
  additional = 1
): Promise<void> {
  const limits = await getPlanLimits(tenantId);
  const limit = limits[resource];
  if (limit < 0) return;

  let current = 0;
  if (resource === 'agents') current = await prisma.agent.count({ where: { tenantId } });
  if (resource === 'users') current = await prisma.user.count({ where: { tenantId } });
  if (resource === 'rooms') current = await prisma.room.count({ where: { tenantId } });
  if (resource === 'knowledgeBytes') {
    const result = await prisma.knowledgeFile.aggregate({
      where: { tenantId },
      _sum: { fileSize: true },
    });
    current = result._sum.fileSize || 0;
  }

  if (current + additional > limit) {
    throw new PlanLimitError(resource, limit, current);
  }
}

export function formatPlanLimit(resource: PlanLimitKey, value: number): string {
  if (resource === 'knowledgeBytes') return value < 0 ? 'ilimitado' : `${Math.round(value / MB)} MB`;
  return value < 0 ? 'ilimitado' : String(value);
}
