import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { writeAuditLog } from '../services/auditLog';

const router = Router();
router.use(tenantMiddleware);

const campaignSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(180),
  objective: z.string().trim().min(10).max(12000),
  offer: z.string().trim().max(12000).optional().nullable(),
  audience: z.string().trim().max(12000).optional().nullable(),
  channels: z.string().trim().max(4000).optional().nullable(),
  budget: z.string().trim().max(200).optional().nullable(),
  period: z.string().trim().max(200).optional().nullable(),
  brief: z.string().trim().max(20000).optional().nullable(),
  agentId: z.string().uuid().optional().nullable(),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId },
      include: { client: { select: { id: true, name: true, segment: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao listar campanhas.' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, tenantId },
      include: { client: true, agent: { select: { id: true, name: true, niche: true } } },
    });
    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao carregar campanha.' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const parsed = campaignSchema.parse(req.body);
    const client = await prisma.client.findFirst({ where: { id: parsed.clientId, tenantId }, select: { id: true } });
    if (!client) {
      res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
      return;
    }
    if (parsed.agentId) {
      const agent = await prisma.agent.findFirst({ where: { id: parsed.agentId, tenantId }, select: { id: true } });
      if (!agent) {
        res.status(404).json({ error: 'Agente não encontrado.' });
        return;
      }
    }
    const campaign = await prisma.campaign.create({ data: { tenantId, ...parsed } });
    await writeAuditLog({
      tenantId, userId: req.user?.userId, action: 'CAMPAIGN_CREATED',
      entity: 'Campaign', entityId: campaign.id,
      metadata: { clientId: campaign.clientId, name: campaign.name },
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao criar campanha.' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const parsed = campaignSchema.partial().parse(req.body);
    const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, tenantId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }
    if (parsed.clientId) {
      const client = await prisma.client.findFirst({ where: { id: parsed.clientId, tenantId }, select: { id: true } });
      if (!client) {
        res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
        return;
      }
    }
    const updated = await prisma.campaign.update({ where: { id: campaign.id }, data: parsed });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao atualizar campanha.' });
  }
});

export default router;
