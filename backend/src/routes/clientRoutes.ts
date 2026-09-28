import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { writeAuditLog } from '../services/auditLog';

const router = Router();
router.use(tenantMiddleware);

const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(200).optional().nullable(),
  document: z.string().trim().max(40).optional().nullable(),
  segment: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().url().max(500).optional().nullable(),
  instagram: z.string().trim().max(200).optional().nullable(),
  linkedin: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(12000).optional().nullable(),
  targetAudience: z.string().trim().max(12000).optional().nullable(),
  productsOffers: z.string().trim().max(12000).optional().nullable(),
  brandVoice: z.string().trim().max(12000).optional().nullable(),
  goals: z.string().trim().max(12000).optional().nullable(),
  competitors: z.string().trim().max(12000).optional().nullable(),
  restrictions: z.string().trim().max(12000).optional().nullable(),
  notes: z.string().trim().max(12000).optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

const resourceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  url: z.string().trim().url().max(2000),
  type: z.enum(['WEBSITE', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'STORE', 'OTHER']).default('WEBSITE'),
  notes: z.string().trim().max(4000).optional().nullable(),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const clients = await prisma.client.findMany({
      where: { tenantId },
      include: {
        _count: { select: { resources: true, knowledgeFiles: true, campaigns: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: clients });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao listar clientes.' });
  }
});

router.get('/:id/context', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        resources: { orderBy: { createdAt: 'desc' } },
        knowledgeFiles: {
          select: { id: true, agentId: true, fileName: true, mimeType: true, chunksCount: true, status: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
        },
        campaigns: { orderBy: { updatedAt: 'desc' }, take: 20 },
      },
    });
    if (!client) {
      res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
      return;
    }
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao carregar contexto da empresa.' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const parsed = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data: { tenantId, ...parsed } });
    await writeAuditLog({
      tenantId, userId: req.user?.userId, action: 'CLIENT_CREATED',
      entity: 'Client', entityId: client.id, metadata: { name: client.name },
    });
    res.status(201).json({ success: true, data: client });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao criar cliente.' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const parsed = clientSchema.partial().parse(req.body);
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
      return;
    }
    const client = await prisma.client.update({ where: { id: existing.id }, data: parsed });
    await writeAuditLog({
      tenantId, userId: req.user?.userId, action: 'CLIENT_UPDATED',
      entity: 'Client', entityId: client.id, metadata: { name: client.name },
    });
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao atualizar cliente.' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
      return;
    }
    await prisma.client.delete({ where: { id: existing.id } });
    await writeAuditLog({
      tenantId, userId: req.user?.userId, action: 'CLIENT_DELETED',
      entity: 'Client', entityId: existing.id, metadata: { name: existing.name },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao excluir cliente.' });
  }
});

router.post('/:id/resources', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const client = await prisma.client.findFirst({ where: { id: req.params.id, tenantId }, select: { id: true } });
    if (!client) {
      res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
      return;
    }
    const parsed = resourceSchema.parse(req.body);
    const resource = await prisma.clientResource.create({ data: { tenantId, clientId: client.id, ...parsed } });
    await writeAuditLog({
      tenantId, userId: req.user?.userId, action: 'CLIENT_RESOURCE_CREATED',
      entity: 'ClientResource', entityId: resource.id, metadata: { clientId: client.id, type: resource.type },
    });
    res.status(201).json({ success: true, data: resource });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao adicionar referência.' });
  }
});

router.delete('/:id/resources/:resourceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const deleted = await prisma.clientResource.deleteMany({
      where: { id: req.params.resourceId, clientId: req.params.id, tenantId },
    });
    if (!deleted.count) {
      res.status(404).json({ error: 'Referência não encontrada.' });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao excluir referência.' });
  }
});

export default router;
