import { prisma } from '../routes/authRoutes';

export type AiUsageInput = {
  tenantId: string;
  requestId?: string | null;
  providerAccountId?: string | null;
  provider: string;
  model: string;
  taskType: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number | null;
  success: boolean;
  errorType?: string | null;
};

export class AiMonthlyLimitError extends Error {
  statusCode = 402;
  code = 'AI_MONTHLY_LIMIT_REACHED';
  constructor(public limit: number, public current: number) {
    super('Limite mensal de requisições de IA atingido.');
  }
}

export async function createAiRequest(tenantId: string, taskType: string): Promise<string> {
  const { getPlanLimits } = await import('./planLimits');
  const limits = await getPlanLimits(tenantId);
  const request = await prisma.$transaction(async (tx) => {
    if (limits.aiRequestsMonthly >= 0) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', tenantId);
      const since = new Date();
      since.setUTCDate(1);
      since.setUTCHours(0, 0, 0, 0);
      const current = await tx.aiRequest.count({ where: { tenantId, createdAt: { gte: since } } });
      if (current >= limits.aiRequestsMonthly) throw new AiMonthlyLimitError(limits.aiRequestsMonthly, current);
    }
    return tx.aiRequest.create({ data: { tenantId, taskType } });
  });
  return request.id;
}

export async function finalizeAiRequest(requestId: string, data: { success: boolean; provider?: string; model?: string; totalTokens?: number }) {
  await prisma.aiRequest.update({
    where: { id: requestId },
    data: {
      success: data.success,
      provider: data.provider,
      model: data.model,
      totalTokens: Math.max(0, data.totalTokens || 0),
    },
  }).catch(() => undefined);
}

export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  await prisma.aiUsage.create({
    data: {
      requestId: input.requestId || null,
      tenantId: input.tenantId,
      providerAccountId: input.providerAccountId || null,
      provider: input.provider,
      model: input.model,
      taskType: input.taskType,
      inputTokens: Math.max(0, input.inputTokens || 0),
      outputTokens: Math.max(0, input.outputTokens || 0),
      totalTokens: Math.max(0, input.totalTokens ?? (input.inputTokens || 0) + (input.outputTokens || 0)),
      estimatedCost: input.estimatedCost ?? null,
      success: input.success,
      errorType: input.errorType || null,
    },
  });
}

export async function getAiUsageSummary(tenantId: string, days = 30) {
  const since = new Date(Date.now() - Math.min(Math.max(days, 1), 365) * 24 * 60 * 60 * 1000);
  const [rows, requests] = await Promise.all([
    prisma.aiUsage.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { provider: true, taskType: true, inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true, success: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    prisma.aiRequest.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { success: true, totalTokens: true, estimatedCost: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
  ]);

  const summary = rows.reduce((acc, row) => {
    const key = row.provider + ':' + row.taskType;
    const current = acc.get(key) || { provider: row.provider, taskType: row.taskType, requests: 0, failures: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 };
    current.requests += 1;
    if (!row.success) current.failures += 1;
    current.inputTokens += row.inputTokens;
    current.outputTokens += row.outputTokens;
    current.totalTokens += row.totalTokens;
    current.estimatedCost += row.estimatedCost || 0;
    acc.set(key, current);
    return acc;
  }, new Map<string, any>());

  return {
    days,
    from: since.toISOString(),
    totals: {
      requests: requests.length,
      failures: requests.filter(r => !r.success).length,
      inputTokens: rows.reduce((s, r) => s + r.inputTokens, 0),
      outputTokens: rows.reduce((s, r) => s + r.outputTokens, 0),
      totalTokens: requests.reduce((s, r) => s + r.totalTokens, 0),
      estimatedCost: requests.reduce((s, r) => s + (r.estimatedCost || 0), 0),
    },
    byProvider: Array.from(summary.values()),
  };
}
