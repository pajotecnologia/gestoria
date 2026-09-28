import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireRoles } from '../middlewares/authorization';
import { writeAuditLog } from '../services/auditLog';
import { encryptCredential } from '../services/aiCredentialCrypto';
import { z } from 'zod';

const router = Router();
router.use(tenantMiddleware);
router.use(requireRoles('AGENCY_ADMIN'));

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  provider: z.enum(['openai', 'gemini', 'groq', 'ollama']),
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().min(1).max(500),
  priority: z.number().int().min(1).max(1000).default(100),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const accounts = await prisma.aiProviderAccount.findMany({
    where: { tenantId: req.tenantId! },
    select: { id: true, name: true, provider: true, model: true, enabled: true, priority: true, lastError: true, lastUsedAt: true, createdAt: true, updatedAt: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ success: true, data: accounts });
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = schema.parse(req.body);
    const account = await prisma.aiProviderAccount.create({
      data: {
        tenantId: req.tenantId!,
        name: data.name,
        provider: data.provider,
        model: data.model,
        encryptedKey: encryptCredential(data.apiKey),
        priority: data.priority,
      },
      select: { id: true, name: true, provider: true, model: true, enabled: true, priority: true, createdAt: true },
    });
    await writeAuditLog({ tenantId: req.tenantId!, userId: req.user?.userId, action: 'AI_PROVIDER_CREATED', entity: 'AiProviderAccount', entityId: account.id, metadata: { provider: account.provider, model: account.model } });
    res.status(201).json({ success: true, data: account });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 503).json({ error: error?.message || 'Não foi possível cadastrar o provedor de IA.' });
  }
});

router.get('/:id/health', async (req: Request, res: Response): Promise<void> => {
  const account = await prisma.aiProviderAccount.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId! },
    select: { id: true, provider: true, model: true, enabled: true, lastError: true, lastUsedAt: true },
  });
  if (!account) { res.status(404).json({ error: 'Provedor de IA não encontrado.' }); return; }
  try {
    if (!account.enabled) {
      res.json({ success: true, data: { ...account, health: 'disabled', message: 'Provedor desativado.' } });
      return;
    }
    // Verificação segura de configuração: não executa uma chamada paga nem expõe a credencial.
    res.json({
      success: true,
      data: {
        ...account,
        health: account.lastError ? 'degraded' : 'configured',
        message: account.lastError ? 'Existe um erro registrado no último uso.' : 'Credencial e configuração disponíveis para uso.',
      },
    });
  } catch {
    res.status(500).json({ error: 'Não foi possível verificar o provedor.' });
  }
});

router.patch('/:id/toggle', async (req: Request, res: Response): Promise<void> => {
  const account = await prisma.aiProviderAccount.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
  if (!account) { res.status(404).json({ error: 'Provedor de IA não encontrado.' }); return; }
  const updated = await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { enabled: !account.enabled }, select: { id: true, enabled: true } });
  await writeAuditLog({ tenantId: req.tenantId!, userId: req.user?.userId, action: 'AI_PROVIDER_TOGGLED', entity: 'AiProviderAccount', entityId: account.id, metadata: { enabled: updated.enabled } });
  res.json({ success: true, data: updated });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const deleted = await prisma.aiProviderAccount.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId! } });
  if (!deleted.count) { res.status(404).json({ error: 'Provedor de IA não encontrado.' }); return; }
  await writeAuditLog({ tenantId: req.tenantId!, userId: req.user?.userId, action: 'AI_PROVIDER_DELETED', entity: 'AiProviderAccount', entityId: req.params.id });
  res.json({ success: true });
});

export default router;
