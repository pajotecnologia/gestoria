import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { writeAuditLog } from '../services/auditLog';
import { generateText } from '../services/aiProviderService';
import { getActiveSpecialistsForTenant } from './specialistRoutes';

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


router.post('/:id/generate-strategy', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        client: {
          include: {
            resources: true,
            knowledgeFiles: {
              where: { status: 'READY' },
              select: { fileName: true, extractedText: true },
              orderBy: { createdAt: 'desc' },
              take: 12,
            },
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }

    const specialists = await getActiveSpecialistsForTenant(tenantId);
    const strategist = specialists.find((item) => item.roleKey === 'STRATEGIST');

    const knowledge = campaign.client.knowledgeFiles
      .map((file) => '### ' + file.fileName + '\n' + (file.extractedText || '').slice(0, 9000))
      .join('\n\n');

    const resources = campaign.client.resources
      .map((resource) => '- ' + resource.title + ' (' + resource.type + '): ' + resource.url + (resource.notes ? ' — ' + resource.notes : ''))
      .join('\n');

    const prompt = [
      'Crie uma estratégia de marketing para a campanha abaixo usando SOMENTE os dados fornecidos como contexto factual.',
      'Não invente características da empresa, ofertas, números, depoimentos ou diferenciais que não estejam no contexto.',
      'Quando faltar informação relevante, marque explicitamente como "VALIDAR COM O CLIENTE".',
      '',
      '## EMPRESA / CLIENTE',
      'Nome: ' + campaign.client.name,
      'Razão social: ' + (campaign.client.legalName || 'Não informado'),
      'Segmento: ' + (campaign.client.segment || 'Não informado'),
      'Site: ' + (campaign.client.website || 'Não informado'),
      'Instagram: ' + (campaign.client.instagram || 'Não informado'),
      'Descrição: ' + (campaign.client.description || 'Não informado'),
      'Público-alvo: ' + (campaign.client.targetAudience || 'Não informado'),
      'Produtos/Ofertas: ' + (campaign.client.productsOffers || 'Não informado'),
      'Tom de marca: ' + (campaign.client.brandVoice || 'Não informado'),
      'Objetivos da empresa: ' + (campaign.client.goals || 'Não informado'),
      'Concorrentes: ' + (campaign.client.competitors || 'Não informado'),
      'Restrições: ' + (campaign.client.restrictions || 'Não informado'),
      '',
      '## REFERÊNCIAS ONLINE CADASTRADAS',
      resources || 'Nenhuma referência cadastrada.',
      '',
      '## DOCUMENTOS E MATERIAIS INDEXADOS',
      knowledge || 'Nenhum documento indexado.',
      '',
      '## BRIEFING DA CAMPANHA',
      'Nome: ' + campaign.name,
      'Objetivo: ' + campaign.objective,
      'Oferta: ' + (campaign.offer || 'VALIDAR COM O CLIENTE'),
      'Público informado: ' + (campaign.audience || 'VALIDAR COM O CLIENTE'),
      'Canais: ' + (campaign.channels || 'VALIDAR COM O CLIENTE'),
      'Orçamento: ' + (campaign.budget || 'Não informado'),
      'Período: ' + (campaign.period || 'Não informado'),
      'Briefing adicional: ' + (campaign.brief || 'Não informado'),
      '',
      '## ENTREGA',
      'Produza: diagnóstico, posicionamento, público prioritário, promessa central, ângulos de campanha, mensagem principal, canais, funil, plano de testes, KPIs, riscos e perguntas de validação.',
    ].join('\n');

    const result = await generateText({
      provider: strategist?.provider || 'openai',
      model: strategist?.model || 'gpt-4o',
      temperature: strategist?.temperature ?? 0.4,
      tenantId,
      taskType: 'war_room',
      messages: [
        {
          role: 'system',
          content: strategist?.systemPrompt || 'Você é um estrategista sênior de marketing. Seja analítico, factual e não invente informações ausentes.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { strategy: result.text, status: 'STRATEGY_READY' },
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_STRATEGY_GENERATED',
      entity: 'Campaign',
      entityId: campaign.id,
      metadata: { provider: result.provider, clientId: campaign.clientId },
    });

    res.json({ success: true, data: updated, provider: result.provider });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Não foi possível gerar a estratégia da campanha.' });
  }
});

export default router;
