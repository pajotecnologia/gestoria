import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { compileRTCEPrompt } from './promptCompiler';
import { validateBody } from '../middlewares/validate';
import { agentCreateSchema, agentUpdateSchema } from '../validation/schemas';
import { parsePagination } from '../utils/pagination';

const router = Router();
router.use(tenantMiddleware);

// Listar todos os agentes do Tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);
    const [agents, total] = await prisma.$transaction([
      prisma.agent.findMany({
        where: { tenantId },
        select: {
          id: true, tenantId: true, name: true, niche: true, provider: true, model: true,
          temperature: true, instanceName: true, whatsappStatus: true, createdAt: true, updatedAt: true,
          _count: { select: { knowledgeFiles: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.agent.count({ where: { tenantId } }),
    ]);
    res.json({ success: true, data: agents, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter agente por ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const agent = await prisma.agent.findFirst({
      where: { id, tenantId },
      include: { knowledgeFiles: true }
    });

    if (!agent) {
      res.status(404).json({ error: 'Agente não encontrado.' });
      return;
    }
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar / Salvar Agente
router.post('/', validateBody(agentCreateSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { name, niche, provider, model, temperature, structure, variables, instanceName } = req.body;

    if (!structure || !structure.role || !structure.task || !structure.context || !structure.execution) {
      res.status(400).json({ error: 'Estrutura RTCE incompleta.' });
      return;
    }

    const { fullSystemPrompt } = compileRTCEPrompt(structure, variables || {});

    const agent = await prisma.agent.create({
      data: {
        tenantId,
        name: name || 'Novo Agente',
        niche: niche || 'Geral',
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        roleText: structure.role,
        taskText: structure.task,
        contextText: structure.context,
        executionText: structure.execution,
        variablesJson: variables || {},
        fullSystemPrompt,
        instanceName: instanceName || `instance_${Date.now()}`
      }
    });

    res.status(201).json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar Agente
router.put('/:id', validateBody(agentUpdateSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, niche, provider, model, temperature, structure, variables } = req.body;

    const { fullSystemPrompt } = compileRTCEPrompt(structure, variables || {});

    const updated = await prisma.agent.updateMany({
      where: { id, tenantId },
      data: {
        name,
        niche,
        provider,
        model,
        temperature,
        roleText: structure.role,
        taskText: structure.task,
        contextText: structure.context,
        executionText: structure.execution,
        variablesJson: variables || {},
        fullSystemPrompt
      }
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Agente não encontrado ou não pertence a este tenant.' });
      return;
    }

    res.json({ success: true, message: 'Agente atualizado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar Agente
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await prisma.agent.deleteMany({
      where: { id, tenantId }
    });

    res.json({ success: true, message: 'Agente removido com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
