import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { writeAuditLog } from '../services/auditLog';

const router = Router();
router.use(tenantMiddleware);

const normalizeUrl = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const optionalUrl = z.preprocess(
  normalizeUrl,
  z.string().trim().max(500).nullable().optional().refine((val) => {
    if (!val) return true;
    try {
      const u = new URL(val);
      return Boolean(u.hostname && u.hostname.length > 1);
    } catch {
      return false;
    }
  }, { message: 'Endereço de website inválido.' }),
);

const resourceUrl = z.preprocess(
  normalizeUrl,
  z.string().trim().max(2000).refine((val) => {
    if (!val) return false;
    try {
      const u = new URL(val);
      return Boolean(u.hostname && u.hostname.length > 1);
    } catch {
      return false;
    }
  }, { message: 'URL do link ou recurso inválida.' }),
);

const clientSchema = z.object({
  name: z.string().trim().min(2, { message: 'O nome da empresa deve ter pelo menos 2 caracteres.' }).max(160),
  legalName: z.string().trim().max(200).optional().nullable(),
  document: z.string().trim().max(40).optional().nullable(),
  segment: z.string().trim().max(120).optional().nullable(),
  website: optionalUrl,
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
  title: z.string().trim().min(2, { message: 'O título do recurso deve ter pelo menos 2 caracteres.' }).max(160),
  url: resourceUrl,
  type: z.enum(['WEBSITE', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'STORE', 'OTHER']).default('WEBSITE'),
  notes: z.string().trim().max(4000).optional().nullable(),
});

function formatZodError(error: any): string {
  if (error?.name === 'ZodError' && Array.isArray(error.issues) && error.issues.length > 0) {
    return error.issues.map((i: any) => {
      const field = i.path && i.path.length ? `${i.path.join('.')}: ` : '';
      return `${field}${i.message}`;
    }).join('; ');
  }
  return error?.message || 'Falha na validação dos dados.';
}

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
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: formatZodError(error) });
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
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: formatZodError(error) });
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
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: formatZodError(error) });
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
