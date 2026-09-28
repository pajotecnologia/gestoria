import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';

const router = Router();
router.use(tenantMiddleware);

type PeriodKey = '7d' | '30d' | '12m';

const getStartDate = (period: PeriodKey, now: Date) => {
  const start = new Date(now);
  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === '30d') start.setDate(start.getDate() - 29);
  if (period === '12m') {
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
};

const bucketKey = (date: Date, period: PeriodKey) => {
  if (period === '12m') return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const rawPeriod = typeof req.query.period === 'string' ? req.query.period : '30d';
    const period: PeriodKey = rawPeriod === '7d' || rawPeriod === '12m' ? rawPeriod : '30d';
    const now = new Date();
    const startDate = getStartDate(period, now);

    const [clients, campaigns, users, previousUsers, activeCampaigns, aiRequests, recentActivity, campaignStatusRows] = await prisma.$transaction([
      prisma.client.findMany({ where: { tenantId, createdAt: { gte: startDate } }, select: { createdAt: true } }),
      prisma.campaign.findMany({ where: { tenantId, createdAt: { gte: startDate } }, select: { createdAt: true } }),
      prisma.user.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId, createdAt: { lt: startDate } } }),
      prisma.campaign.count({ where: { tenantId, isActive: true } }),
      prisma.aiRequest.findMany({ where: { tenantId, createdAt: { gte: startDate } }, select: { createdAt: true } }),
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, entity: true, entityId: true, metadata: true, createdAt: true, user: { select: { name: true } } },
      }),
      prisma.campaign.findMany({
        where: { tenantId },
        select: { status: true },
      }),
    ]);

    const buckets = new Map<string, { label: string; clients: number; campaigns: number; aiRequests: number }>();
    const bucketCount = period === '12m' ? 12 : period === '30d' ? 30 : 7;

    for (let i = 0; i < bucketCount; i += 1) {
      const date = new Date(startDate);
      if (period === '12m') date.setMonth(startDate.getMonth() + i);
      else date.setDate(startDate.getDate() + i);
      const key = bucketKey(date, period);
      buckets.set(key, { label: key, clients: 0, campaigns: 0, aiRequests: 0 });
    }

    for (const item of clients) {
      const bucket = buckets.get(bucketKey(item.createdAt, period));
      if (bucket) bucket.clients += 1;
    }

    for (const item of campaigns) {
      const bucket = buckets.get(bucketKey(item.createdAt, period));
      if (bucket) bucket.campaigns += 1;
    }

    for (const item of aiRequests) {
      const bucket = buckets.get(bucketKey(item.createdAt, period));
      if (bucket) bucket.aiRequests += 1;
    }

    const campaignDistribution = new Map<string, number>();
    for (const item of campaignStatusRows) {
      campaignDistribution.set(item.status, (campaignDistribution.get(item.status) || 0) + 1);
    }

    const activity = recentActivity.map((item) => ({
      id: item.id,
      action: item.action,
      entity: item.entity,
      entityId: item.entityId,
      metadata: item.metadata,
      userName: item.user?.name || 'Sistema',
      createdAt: item.createdAt,
      status: item.action.includes('ERROR') || item.action.includes('FAILED') ? 'ERROR' : 'SUCCESS',
    }));

    res.json({
      success: true,
      data: {
        period,
        generatedAt: now,
        kpis: {
          revenue: null,
          activeUsers: users,
          activeUsersVariation: previousUsers > 0 ? ((users - previousUsers) / previousUsers) * 100 : null,
          conversions: null,
          conversionsVariation: null,
          retention: null,
          retentionVariation: null,
          revenueVariation: null,
          activeCampaigns,
        },
        trend: Array.from(buckets.values()),
        distribution: Array.from(campaignDistribution.entries()).map(([category, value]) => ({ category, value })),
        activity,
        availability: {
          revenue: 'NOT_CONFIGURED',
          conversions: 'NOT_TRACKED',
          retention: 'NOT_TRACKED',
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Falha ao carregar analytics.' });
  }
});

export default router;
