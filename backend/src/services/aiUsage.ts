import { prisma } from '../routes/authRoutes';

export type AiUsageInput = {
  tenantId: string;
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

export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  await prisma.aiUsage.create({
    data: {
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
  const rows = await prisma.aiUsage.findMany({
    where: { tenantId, createdAt: { gte: since } },
    select: {
      provider: true,
      taskType: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      estimatedCost: true,
      success: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const summary = rows.reduce((acc, row) => {
    const key = row.provider + ':' + row.taskType;
    const current = acc.get(key) || {
      provider: row.provider,
      taskType: row.taskType,
      requests: 0,
      failures: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };
    current.requests += 1;
    if (!row.success) current.failures += 1;
    current.inputTokens += row.inputTokens;
    current.outputTokens += row.outputTokens;
    current.totalTokens += row.totalTokens;
    current.estimatedCost += row.estimatedCost || 0;
    acc.set(key, current);
    return acc;
  }, new Map<string, {
    provider: string;
    taskType: string;
    requests: number;
    failures: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  }>());

  return {
    days,
    from: since.toISOString(),
    totals: {
      requests: rows.length,
      failures: rows.filter((row) => !row.success).length,
      inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
      outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
      totalTokens: rows.reduce((sum, row) => sum + row.totalTokens, 0),
      estimatedCost: rows.reduce((sum, row) => sum + (row.estimatedCost || 0), 0),
    },
    byProvider: Array.from(summary.values()),
  };
}
