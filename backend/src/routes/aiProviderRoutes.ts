import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireRoles } from '../middlewares/authorization';
import { writeAuditLog } from '../services/auditLog';
import { encryptCredential, decryptCredential } from '../services/aiCredentialCrypto';
import { callChat, AiProvider } from '../services/aiProviderService';
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

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  provider: z.enum(['openai', 'gemini', 'groq', 'ollama']).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  apiKey: z.string().trim().max(500).optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  enabled: z.boolean().optional(),
});

// Listar todos os provedores
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const accounts = await prisma.aiProviderAccount.findMany({
    where: { tenantId: req.tenantId! },
    select: { id: true, name: true, provider: true, model: true, enabled: true, priority: true, lastError: true, lastUsedAt: true, createdAt: true, updatedAt: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ success: true, data: accounts });
});

// Cadastrar novo provedor
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

// Editar provedor existente
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await prisma.aiProviderAccount.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! }
    });
    if (!account) {
      res.status(404).json({ error: 'Provedor de IA não encontrado.' });
      return;
    }

    const data = updateSchema.parse(req.body);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.apiKey && data.apiKey.trim()) {
      updateData.encryptedKey = encryptCredential(data.apiKey.trim());
      updateData.lastError = null; // limpa erro anterior se chave foi atualizada
    }

    const updated = await prisma.aiProviderAccount.update({
      where: { id: account.id },
      data: updateData,
      select: { id: true, name: true, provider: true, model: true, enabled: true, priority: true, lastError: true, lastUsedAt: true, updatedAt: true }
    });

    await writeAuditLog({
      tenantId: req.tenantId!,
      userId: req.user?.userId,
      action: 'AI_PROVIDER_UPDATED',
      entity: 'AiProviderAccount',
      entityId: updated.id,
      metadata: { provider: updated.provider, model: updated.model }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Não foi possível atualizar o provedor de IA.' });
  }
});

// Testar Provedor em tempo real (chamada live com ping)
router.post('/:id/test', async (req: Request, res: Response): Promise<void> => {
  const account = await prisma.aiProviderAccount.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId! }
  });
  if (!account) {
    res.status(404).json({ error: 'Provedor de IA não encontrado.' });
    return;
  }

  const startTime = Date.now();
  try {
    const rawKey = decryptCredential(account.encryptedKey);
    const result = await callChat(account.provider as AiProvider, rawKey, {
      model: account.model,
      temperature: 0.1,
      messages: [{ role: 'user', content: 'Diga apenas: Conexão bem-sucedida.' }]
    });

    const latencyMs = Date.now() - startTime;

    await prisma.aiProviderAccount.update({
      where: { id: account.id },
      data: { lastError: null, lastUsedAt: new Date() }
    });

    res.json({
      success: true,
      data: {
        latencyMs,
        reply: result.text.trim(),
        provider: account.provider,
        model: account.model,
        message: `Conectado com sucesso em ${latencyMs}ms!`
      }
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = String(error?.response?.data?.error?.message || error?.message || error);
    
    await prisma.aiProviderAccount.update({
      where: { id: account.id },
      data: { lastError: errMsg.slice(0, 500) }
    }).catch(() => undefined);

    res.status(400).json({
      success: false,
      error: errMsg,
      latencyMs,
      message: `Falha na conexão (${latencyMs}ms): ${errMsg}`
    });
  }
});

// Testar credencial antes de salvar (teste rápido do formulário)
router.post('/test-unsaved', async (req: Request, res: Response): Promise<void> => {
  const { provider, model, apiKey } = req.body;
  if (!provider || !apiKey) {
    res.status(400).json({ error: 'Provedor e Chave/URL são obrigatórios para o teste.' });
    return;
  }

  const startTime = Date.now();
  try {
    const result = await callChat(provider as AiProvider, apiKey.trim(), {
      model: model || (provider === 'gemini' ? 'gemini-3.8-flash' : provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'ollama' ? 'llama3.1' : 'gpt-4o'),
      temperature: 0.1,
      messages: [{ role: 'user', content: 'Diga apenas: Conexão bem-sucedida.' }]
    });

    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        latencyMs,
        reply: result.text.trim(),
        message: `Conexão validada com sucesso em ${latencyMs}ms!`
      }
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = String(error?.response?.data?.error?.message || error?.message || error);
    res.status(400).json({
      success: false,
      error: errMsg,
      latencyMs,
      message: `Falha na validação (${latencyMs}ms): ${errMsg}`
    });
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
