import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { writeAuditLog } from '../services/auditLog';
import { generateText, generateImage } from '../services/aiProviderService';
import { getActiveSpecialistsForTenant } from './specialistRoutes';
import { getCampaignLifecycleStatus, validateCampaignPeriod } from '../services/campaignLifecycle';

const router = Router();
router.use(tenantMiddleware);

const lifecycleStatus = (campaign: { isActive: boolean; startDate: Date | null; endDate: Date | null }) =>
  getCampaignLifecycleStatus(campaign.isActive, campaign.startDate, campaign.endDate);

const serializeCampaign = <T extends { isActive: boolean; startDate: Date | null; endDate: Date | null }>(campaign: T) => ({
  ...campaign,
  lifecycleStatus: lifecycleStatus(campaign),
});


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
  isActive: z.boolean().optional(),
  startDate: z.preprocess((value) => value === '' || value === null || value === undefined ? null : value, z.coerce.date().nullable()).optional(),
  endDate: z.preprocess((value) => value === '' || value === null || value === undefined ? null : value, z.coerce.date().nullable()).optional(),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const isActive = typeof req.query.isActive === 'string' ? req.query.isActive === 'true' : undefined;
    const campaigns = await prisma.campaign.findMany({
      where: {
        tenantId,
        ...(clientId ? { clientId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { objective: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      include: { client: { select: { id: true, name: true, segment: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const data = campaigns.map(serializeCampaign).filter((campaign) => !status || campaign.lifecycleStatus === status);
    res.json({ success: true, data });
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
    res.json({ success: true, data: serializeCampaign(campaign) });
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
    const periodError = validateCampaignPeriod(parsed.startDate, parsed.endDate);
    if (periodError) { res.status(400).json({ error: periodError }); return; }
    if (parsed.isActive && (!parsed.startDate || !parsed.endDate)) {
      res.status(400).json({ error: 'Para ativar uma campanha, informe o período completo.' });
      return;
    }
    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        ...parsed,
        isActive: parsed.isActive ?? false,
        startDate: parsed.startDate ?? null,
        endDate: parsed.endDate ?? null,
        status: parsed.isActive ? getCampaignLifecycleStatus(true, parsed.startDate, parsed.endDate) : 'DRAFT',
      },
    });
    await writeAuditLog({
      tenantId, userId: req.user?.userId, action: 'CAMPAIGN_CREATED',
      entity: 'Campaign', entityId: campaign.id,
      metadata: { clientId: campaign.clientId, name: campaign.name },
    });
    res.status(201).json({ success: true, data: serializeCampaign(campaign) });
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
    const nextStart = parsed.startDate === undefined ? campaign.startDate : parsed.startDate;
    const nextEnd = parsed.endDate === undefined ? campaign.endDate : parsed.endDate;
    const nextActive = parsed.isActive === undefined ? campaign.isActive : parsed.isActive;
    const periodError = validateCampaignPeriod(nextStart, nextEnd);
    if (periodError) { res.status(400).json({ error: periodError }); return; }
    if (nextActive && (!nextStart || !nextEnd)) {
      res.status(400).json({ error: 'Para ativar uma campanha, informe o período completo.' });
      return;
    }
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        ...parsed,
        isActive: nextActive,
        startDate: nextStart,
        endDate: nextEnd,
        status: nextActive ? getCampaignLifecycleStatus(true, nextStart, nextEnd) : 'PAUSADA',
      },
    });
    await writeAuditLog({
      tenantId, userId: req.user?.userId,
      action: parsed.isActive !== undefined && parsed.isActive !== campaign.isActive
        ? (parsed.isActive ? 'CAMPAIGN_ACTIVATED' : 'CAMPAIGN_DEACTIVATED')
        : (parsed.startDate !== undefined || parsed.endDate !== undefined ? 'CAMPAIGN_PERIOD_UPDATED' : 'CAMPAIGN_UPDATED'),
      entity: 'Campaign', entityId: campaign.id,
      metadata: { clientId: updated.clientId, isActive: updated.isActive, startDate: updated.startDate, endDate: updated.endDate },
    });
    res.json({ success: true, data: serializeCampaign(updated) });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao atualizar campanha.' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, tenantId }, select: { id: true, clientId: true, name: true } });
    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_DELETED',
      entity: 'Campaign',
      entityId: campaign.id,
      metadata: { clientId: campaign.clientId, name: campaign.name },
    });
    res.json({ success: true, data: { id: campaign.id } });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Falha ao excluir campanha.' });
  }
});

router.patch('/:id/activation', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const parsed = z.object({ isActive: z.boolean() }).parse(req.body);
    const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, tenantId } });
    if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada.' }); return; }
    if (parsed.isActive && (!campaign.startDate || !campaign.endDate)) {
      res.status(400).json({ error: 'Defina o período de início e fim antes de ativar a campanha.' });
      return;
    }
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { isActive: parsed.isActive, status: parsed.isActive ? getCampaignLifecycleStatus(true, campaign.startDate, campaign.endDate) : 'PAUSADA' },
    });
    await writeAuditLog({
      tenantId, userId: req.user?.userId,
      action: parsed.isActive ? 'CAMPAIGN_ACTIVATED' : 'CAMPAIGN_DEACTIVATED',
      entity: 'Campaign', entityId: campaign.id,
      metadata: { clientId: campaign.clientId, startDate: campaign.startDate, endDate: campaign.endDate },
    });
    res.json({ success: true, data: serializeCampaign(updated) });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao alterar ativação da campanha.' });
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
      data: { strategy: result.text },
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_STRATEGY_GENERATED',
      entity: 'Campaign',
      entityId: campaign.id,
      metadata: { provider: result.provider, clientId: campaign.clientId },
    });

    res.json({ success: true, data: serializeCampaign(updated), provider: result.provider });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Não foi possível gerar a estratégia da campanha.' });
  }
});

// Atualizar Métricas de Performance da Campanha (Tráfego Pago / Anúncios)
const campaignMetricsSchema = z.object({
  spend: z.number().min(0).optional().nullable(),
  impressions: z.number().int().min(0).optional().nullable(),
  clicks: z.number().int().min(0).optional().nullable(),
  conversions: z.number().int().min(0).optional().nullable(),
  revenue: z.number().min(0).optional().nullable(),
});

router.patch('/:id/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const parsed = campaignMetricsSchema.parse(req.body);

    const existing = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        spend: parsed.spend !== undefined ? parsed.spend : existing.spend,
        impressions: parsed.impressions !== undefined ? parsed.impressions : existing.impressions,
        clicks: parsed.clicks !== undefined ? parsed.clicks : existing.clicks,
        conversions: parsed.conversions !== undefined ? parsed.conversions : existing.conversions,
        revenue: parsed.revenue !== undefined ? parsed.revenue : existing.revenue,
      },
      include: {
        client: { select: { id: true, name: true, segment: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_METRICS_UPDATED',
      entity: 'Campaign',
      entityId: id,
      metadata: { spend: updated.spend, conversions: updated.conversions, revenue: updated.revenue },
    }).catch(() => undefined);

    res.json({ success: true, data: serializeCampaign(updated) });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao atualizar métricas da campanha.' });
  }
});

// Diagnóstico Inteligente de Otimização de Performance por IA
router.post('/:id/analyze-metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }

    const spend = campaign.spend || 0;
    const impressions = campaign.impressions || 0;
    const clicks = campaign.clicks || 0;
    const conversions = campaign.conversions || 0;
    const revenue = campaign.revenue || 0;

    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';
    const cpa = conversions > 0 ? (spend / conversions).toFixed(2) : '0.00';
    const roas = spend > 0 ? (revenue / spend).toFixed(2) : '0.00';
    const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
    const profit = (revenue - spend).toFixed(2);

    const specialists = await getActiveSpecialistsForTenant(tenantId);
    const trafficManager = specialists.find((item) => item.roleKey === 'TRAFFIC_MANAGER');
    const strategist = specialists.find((item) => item.roleKey === 'STRATEGIST');

    const prompt = `Você é a Renata Dias (Gestora Chefe de Tráfego e Mídia Paga) e o Dr. Arthur Valente (CMO & Estrategista).
Sua missão: Realizar uma auditoria técnica rigorosa e profunda dos resultados da campanha para entregar um plano de otimização de alta conversão.

### 🏢 CONTEXTO DA EMPRESA & CAMPANHA:
- Empresa: ${campaign.client.name} ${campaign.client.segment ? `(Segmento: ${campaign.client.segment})` : ''}
- Campanha: ${campaign.name}
- Objetivo Declarado: ${campaign.objective}
- Público Segmentado: ${campaign.audience || 'Não especificado'}
- Canais de Mídia: ${campaign.channels || 'Meta Ads / Google Ads / TikTok'}
- Oferta: ${campaign.offer || 'Padrão'}
- Orçamento Planejado: ${campaign.budget || 'N/A'}

### 📊 NÚMEROS E MÉTRICAS REAIS COLETADOS:
- 💰 Investimento Total: R$ ${spend.toFixed(2)}
- 👁️ Impressões Totais: ${impressions.toLocaleString('pt-BR')}
- 🖱️ Cliques no Link: ${clicks.toLocaleString('pt-BR')}
- 📈 CTR (Taxa de Cliques): ${ctr}%
- 💵 CPC Médio: R$ ${cpc}
- 🎯 Conversões (Leads / Vendas): ${conversions.toLocaleString('pt-BR')}
- 🏷️ CPL / CPA (Custo por Conversão): R$ ${cpa}
- 📑 Taxa de Conversão da Página (CR): ${convRate}%
- 💎 Faturamento / Receita: R$ ${revenue.toFixed(2)}
- 🚀 ROAS: ${roas}x (Lucro Líquido: R$ ${profit})

### INSTRUÇÕES DE ESTRUTURAÇÃO DO RELATÓRIO:
Estruture sua resposta de forma executiva, clara e altamente acionável com:
1. 🚦 **TERMÔMETRO GERAL DE PERFORMANCE** (Classificação: EXCELENTE, SAUDÁVEL, ATENÇÃO ou CRÍTICO com justificativa dos números).
2. 🔍 **ANÁLISE DO FUNIL DE CONVERSÃO**:
   - Topo de Funil (Criativos & CTR): O anúncio está atraindo o público certo?
   - Meio de Funil (CPC & Qualidade do Tráfego): O custo do clique está competitivo?
   - Fundo de Funil (Taxa de Conversão & CPL/ROAS): A oferta e página estão convertendo?
3. 🚨 **PRINCIPAIS GARGALOS E PONTOS DE VAZAMENTO IDENTIFICADOS**.
4. 🛠️ **PLANO DE AÇÃO & TESTES A/B RECOMENDADOS (Próximos 7 Dias)**:
   - Mudanças em Criativos/Hooks, Segmentação de Públicos, Ajustes de Página e Oferta.
5. 💡 **DIRETRIZES DE VERBA** (Recomendação: Escalar orçamento, manter com ajustes ou pausar/redirecionar).`;

    const result = await generateText({
      provider: trafficManager?.provider || strategist?.provider || 'openai',
      model: trafficManager?.model || strategist?.model || 'gpt-4o',
      temperature: 0.5,
      tenantId,
      taskType: 'war_room',
      messages: [
        {
          role: 'system',
          content: 'Você é um auditor especialista em performance de tráfego pago e neuromarketing. Seja pragmático, objetivo, numérico e forneça direcionamentos claros.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        aiDiagnostic: result.text,
        aiDiagnosticAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true, segment: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_AI_DIAGNOSTIC_GENERATED',
      entity: 'Campaign',
      entityId: id,
      metadata: { roas, ctr, cpa, provider: result.provider },
    }).catch(() => undefined);

    res.json({
      success: true,
      data: {
        campaign: serializeCampaign(updated),
        diagnostic: result.text,
        diagnosticAt: updated.aiDiagnosticAt,
        kpis: {
          spend,
          impressions,
          clicks,
          conversions,
          revenue,
          ctr: parseFloat(ctr),
          cpc: parseFloat(cpc),
          cpa: parseFloat(cpa),
          roas: parseFloat(roas),
          convRate: parseFloat(convRate),
          profit: parseFloat(profit),
        },
        provider: result.provider,
      },
    });
  } catch (error: any) {
    console.error('[AI Metrics Diagnostic Error]:', error);
    res.status(500).json({ error: error?.message || 'Falha ao gerar diagnóstico de performance por IA.' });
  }
});

import {
  testMetaAdAccount,
  listMetaCampaigns,
  fetchMetaInsights,
} from '../services/metaMarketingService';

// Testar Conexão com a Conta de Anúncios da Meta e Listar Campanhas
router.post('/meta/test-connection', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metaAccessToken, metaAdAccountId } = req.body;
    if (!metaAccessToken || !metaAdAccountId) {
      res.status(400).json({ error: 'Meta Access Token e ID da Conta de Anúncios são obrigatórios.' });
      return;
    }

    const [accountInfo, campaigns] = await Promise.all([
      testMetaAdAccount(metaAccessToken, metaAdAccountId),
      listMetaCampaigns(metaAccessToken, metaAdAccountId).catch(() => []),
    ]);

    res.json({
      success: true,
      data: {
        accountInfo,
        campaigns,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Falha ao conectar com a Meta Ads API.' });
  }
});

// Sincronizar Métricas da Campanha com a Meta Marketing Graph API
router.post('/:id/sync-meta', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const {
      metaAccessToken,
      metaAdAccountId,
      metaCampaignId,
      datePreset = 'maximum',
      saveCredentials = true,
    } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { client: true },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }

    const tokenToUse = metaAccessToken || campaign.metaAccessToken || campaign.client.metaAccessToken;
    const adAccountToUse = metaAdAccountId || campaign.metaAdAccountId || campaign.client.metaAdAccountId;
    const campaignIdToUse = metaCampaignId || campaign.metaCampaignId;

    if (!tokenToUse) {
      res.status(400).json({
        error: 'Meta Access Token não encontrado. Forneça o token ou configure-o na campanha/empresa.',
      });
      return;
    }

    if (!adAccountToUse && !campaignIdToUse) {
      res.status(400).json({
        error: 'Informe o ID da Conta de Anúncios ou o ID da Campanha da Meta para sincronização.',
      });
      return;
    }

    // Busca dados em tempo real da Meta Graph API
    const insights = await fetchMetaInsights({
      accessToken: tokenToUse,
      adAccountId: adAccountToUse || undefined,
      campaignId: campaignIdToUse || undefined,
      datePreset,
    });

    // Atualiza os números no banco de dados
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        spend: insights.spend,
        impressions: insights.impressions,
        clicks: insights.clicks,
        conversions: insights.conversions,
        revenue: insights.revenue,
        metaLastSyncAt: new Date(),
        ...(saveCredentials
          ? {
              metaAccessToken: metaAccessToken ? metaAccessToken.trim() : campaign.metaAccessToken,
              metaAdAccountId: adAccountToUse ? adAccountToUse.trim() : campaign.metaAdAccountId,
              metaCampaignId: campaignIdToUse ? campaignIdToUse.trim() : campaign.metaCampaignId,
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true, segment: true } },
      },
    });

    // Se solicitado salvar credenciais e a empresa não possuir, atualiza a empresa também
    if (saveCredentials && tokenToUse && adAccountToUse && !campaign.client.metaAccessToken) {
      await prisma.client
        .update({
          where: { id: campaign.clientId },
          data: {
            metaAccessToken: tokenToUse.trim(),
            metaAdAccountId: adAccountToUse.trim(),
          },
        })
        .catch(() => undefined);
    }

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_META_SYNCED',
      entity: 'Campaign',
      entityId: id,
      metadata: {
        spend: insights.spend,
        conversions: insights.conversions,
        revenue: insights.revenue,
        datePreset,
      },
    }).catch(() => undefined);

    res.json({
      success: true,
      data: serializeCampaign(updated),
      insights,
    });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Falha ao sincronizar com Meta Ads.' });
  }
});

// Ad Studio: Gerar Criativos, Copies e Roteiros de Anúncios com Sofia, Bruno e Roberto
router.post('/:id/generate-ad-creatives', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        client: {
          include: {
            resources: true,
            knowledgeFiles: {
              where: { status: 'READY' },
              select: { fileName: true, extractedText: true },
              take: 8,
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
    const copywriter = specialists.find((item) => item.roleKey === 'COPYWRITER');
    const designer = specialists.find((item) => item.roleKey === 'DESIGNER');
    const strategist = specialists.find((item) => item.roleKey === 'STRATEGIST');
    const videomaker = specialists.find((item) => item.roleKey === 'VIDEOMAKER');

    const copywriterName = copywriter?.name || 'Camila Rocha';
    const designerName = designer?.name || 'Lucas Viana';
    const strategistName = strategist?.name || 'Dr. Arthur Valente';
    const videomakerName = videomaker?.name || 'Gabriel Sato';

    const prompt = `Você representa o squad de especialistas de elite da agência:
- ✍️ Copywriting de Resposta Direta: ${copywriterName} (${copywriter?.title || 'Copywriter Sênior'})
- 🎨 Direção de Arte & Visual: ${designerName} (${designer?.title || 'Diretor de Arte'})
- 🎯 Estratégia & Posicionamento: ${strategistName} (${strategist?.title || 'Estrategista Chefe'})
- 🎬 Roteiros de Vídeo & Reels: ${videomakerName} (${videomaker?.title || 'Roteirista de Vídeos'})

${copywriter?.systemPrompt ? `### DIRETRIZES ESPECÍFICAS DE COPYWRITING (${copywriterName}):\n${copywriter.systemPrompt}\n` : ''}
${designer?.systemPrompt ? `### DIRETRIZES ESPECÍFICAS DE DESIGN & ESTÉTICA (${designerName}):\n${designer.systemPrompt}\n` : ''}

Sua missão: Criar o pacote definitivo de criativos, copies, ganchos e roteiros de anúncios para a campanha abaixo.

### 🏢 CONTEXTO DO CLIENTE / EMPRESA:
- Empresa: ${campaign.client.name}
- Segmento: ${campaign.client.segment || 'Não informado'}
- Público-Alvo: ${campaign.client.targetAudience || campaign.audience || 'Não informado'}
- Oferta Principal: ${campaign.client.productsOffers || campaign.offer || 'Não informado'}
- Tom de Marca: ${campaign.client.brandVoice || 'Profissional e Persuasivo'}
- Diferenciais: ${campaign.client.description || 'Não informado'}

### 🎯 BRIEFING DA CAMPANHA:
- Nome: ${campaign.name}
- Objetivo: ${campaign.objective}
- Canais de Mídia: ${campaign.channels || 'Meta Ads (Facebook & Instagram), TikTok, Google'}
- Orçamento: ${campaign.budget || 'N/A'}
- Estratégia Aprovada: ${campaign.strategy ? campaign.strategy.slice(0, 1500) : 'Estratégia padrão'}

### 📦 PACOTE DE ENTREGAS OBRIGATÓRIO (Estruture em Markdown limpo e organizado):

## 1. 🪝 5 GANCHOS / HOOKS DE ALTA RETENÇÃO (Para os primeiros 3 segundos ou Títulos de Anúncio)
- **Gancho 1 (Padrão de Interrupção / Choque):** ...
- **Gancho 2 (Dor Específica / Identificação Imediata):** ...
- **Gancho 3 (Curiosidade / Segredo Revelado):** ...
- **Gancho 4 (Desejo / Transformação Rápida):** ...
- **Gancho 5 (Prova Social / Estatística Impactante):** ...

## 2. 📝 3 VARIAÇÕES DE COPY COMPLETAS PARA ANÚNCIOS (Meta Ads / Instagram)
- **Variação A (Estrutura AIDA - Atenção, Interesse, Desejo, Ação):**
  - Texto completo com formatação, emojis moderados e CTA clara.
- **Variação B (Estrutura PAS - Problema, Agitação, Solução):**
  - Foco na dor e na urgência da solução.
- **Variação C (Estrutura Storytelling & Conexão):**
  - História de transformação ou caso prático realista.

## 3. 🎬 2 ROTEIROS DE VÍDEO DINÂMICOS (Reels / TikTok / Stories - 30 a 45 segundos)
- **Roteiro 1 (Vídeo Direto ao Ponto - "Você sabia que..."):**
  - [0-3s]: Cena & Fala do Gancho
  - [3-15s]: Desenvolvimento do Problema
  - [15-30s]: Apresentação da Oferta & Benefícios
  - [30-40s]: Chamada para Ação (CTA)
- **Roteiro 2 (Vídeo Quebra de Objeção / Comparativo):**
  - Estrutura completa com indicações de texto na tela e ângulo de câmera.

## 4. 🎨 BRIEFING VISUAL PARA O DESIGNER (Criativos Estáticos e Carrosséis)
- **Arte Estática 1 (Foco na Oferta):** Sugestão de imagem/foto, cores de contraste, texto principal da imagem (máx 20% da tela) e botão sugerido.
- **Carrossel de 4 Telas (Foco em Conteúdo + Venda):**
  - Tela 1 (Capa com Gancho): ...
  - Tela 2 (O Erro Comum): ...
  - Tela 3 (A Solução / Método): ...
  - Tela 4 (Chamada Final / CTA): ...

## 5. 💬 3 OPÇÕES DE BOTÕES & CTAs FINAIS
- CTAs de alta taxa de conversão testadas para o nicho.`;

    const result = await generateText({
      provider: copywriter?.provider || strategist?.provider || 'openai',
      model: copywriter?.model || strategist?.model || 'gpt-4o',
      temperature: 0.6,
      tenantId,
      taskType: 'war_room',
      messages: [
        {
          role: 'system',
          content: 'Você é um time de ponta de copywriters de resposta direta e diretores de arte. Escreva anúncios persuasivos, magnéticos, profissionais e prontos para publicar.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        adCreatives: result.text,
        adCreativesGeneratedAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true, segment: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_AD_CREATIVES_GENERATED',
      entity: 'Campaign',
      entityId: id,
      metadata: { provider: result.provider },
    }).catch(() => undefined);

    res.json({
      success: true,
      data: serializeCampaign(updated),
      adCreatives: result.text,
      generatedAt: updated.adCreativesGeneratedAt,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('[Ad Studio Generation Error]:', error);
    res.status(500).json({ error: error?.message || 'Falha ao gerar anúncios e criativos.' });
  }
});

// Ad Studio: Gerar Imagem do Criativo com DALL-E 3 / Flux
router.post('/:id/generate-ad-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { prompt, title, format, quantity = 1, visualStyle = 'brazilian_people' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'O prompt visual da imagem é obrigatório.' });
      return;
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { client: true },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campanha não encontrada.' });
      return;
    }

    const requestedFormat: '1:1' | '9:16' | '16:9' = ['1:1', '9:16', '16:9'].includes(format) ? format : '1:1';
    const count = Math.min(Math.max(Number(quantity) || 1, 1), 4);

    const STYLE_CONFIG: Record<string, { prefix: string; focus: string }> = {
      brazilian_people: {
        prefix: 'Award-winning commercial advertising photography of authentic Brazilian people',
        focus: 'real everyday Brazilian men, women and children, diverse warm olive and golden brown skin tones, rich dark curly and wavy hair, candid radiant Brazilian smiles, realistic human skin pores, sunny daylight in Rio de Janeiro or São Paulo, shot on Canon EOS R5 with 85mm f/1.2 lens, 8k resolution, National Geographic commercial style RAW photograph, razor-sharp focus, crystal clear details',
      },
      brazilian_business: {
        prefix: 'Modern Brazilian corporate advertising photography',
        focus: 'successful Brazilian business executives and entrepreneurs in a modern São Paulo office, authentic Latin American professionals, natural skin textures, stylish corporate attire, sharp studio softbox lighting, 8k resolution RAW photo',
      },
      brazilian_retail: {
        prefix: 'Vibrant Brazilian retail advertising lifestyle photography',
        focus: 'cheerful Brazilian customers and families in a modern Brazilian store, warm sunny daylight, high energy commercial marketing, sharp focus, 8k resolution RAW photo',
      },
      product_only: {
        prefix: 'High-end commercial product photography',
        focus: 'clean minimalist advertising studio podium, soft luxury lighting, razor sharp details, 8k masterpiece, no people',
      },
    };

    const styleInfo = STYLE_CONFIG[visualStyle] || STYLE_CONFIG.brazilian_people;

    // Otimiza o prompt para inglês com foco estrito em fotografia publicitária brasileira
    let visualPromptInEnglish = prompt.trim();
    try {
      const translationRes = await generateText({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.3,
        tenantId,
        taskType: 'war_room',
        messages: [
          {
            role: 'system',
            content: `You are an award-winning Brazilian Advertising Art Director. Create an ultra-detailed, photorealistic commercial photography prompt for an advertising campaign in Brazil.
Guidelines:
1. When people or models are depicted, explicitly describe them as authentic Brazilian / Latin American individuals with diverse warm skin tones (moreno, pardo, mixed), natural hair textures, real human skin pores, and genuine warm smiles.
2. Photographic qualities: Crisp 8k DSLR photography, natural lighting, sharp focus, 85mm lens, realistic textures.
3. NEVER mention unwanted words (do not write "no anime", "no asian", etc. because text-to-image models accidentally draw mentioned words). Instead, purely describe the desired Brazilian photorealistic scene in rich positive detail.
4. Style focus: ${styleInfo.focus}.
5. Output ONLY the descriptive English prompt in one paragraph starting with "${styleInfo.prefix}".`
          },
          {
            role: 'user',
            content: `Campaign: ${campaign.name}. Business: ${campaign.client.name} (${campaign.client.segment || 'Marketing'}). Objective: ${campaign.objective}. Idea: ${prompt}`
          }
        ]
      });
      if (translationRes?.text?.trim()) {
        visualPromptInEnglish = translationRes.text.trim();
      }
    } catch {
      visualPromptInEnglish = `${styleInfo.prefix}: ${prompt.trim()}, ${styleInfo.focus}, 8k, cinematic commercial lighting`;
    }

    const VARIATION_ANGLES = [
      'front hero angle, candid authentic Brazilian expression, vibrant commercial advertising lighting, clean composition',
      'lifestyle action shot, warm natural sunlight, happy authentic emotion, realistic Brazilian people',
      'close-up portrait focusing on genuine smile and human connection, editorial commercial advertising, sharp focus',
      'modern cinematic environment, high contrast professional studio lighting, sleek aesthetic'
    ];

    const images: any[] = [];
    for (let idx = 0; idx < count; idx++) {
      const angle = VARIATION_ANGLES[idx % VARIATION_ANGLES.length];
      const variationPrompt = `${visualPromptInEnglish}, ${angle}`;
      const seed = Math.floor(Math.random() * 800000) + 100000 + idx * 12345;
      
      const result = await generateImage(variationPrompt, tenantId, { format: requestedFormat, seed });
      images.push({
        id: `${Date.now()}_${idx}`,
        imageUrl: result.url,
        provider: result.provider,
        prompt: prompt.trim(),
        englishPrompt: variationPrompt,
        title: count > 1 ? `${title || 'Arte do Anúncio'} (Variação ${idx + 1})` : (title || 'Arte do Anúncio'),
        format: requestedFormat,
        visualStyle,
        generatedAt: new Date(),
      });
      // Delay entre gerações para escalonar requisições e garantir estabilidade
      if (idx < count - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'CAMPAIGN_AD_IMAGE_GENERATED',
      entity: 'Campaign',
      entityId: id,
      metadata: { count, format: requestedFormat, title: title || 'Ad Creative Visual' },
    }).catch(() => undefined);

    res.json({
      success: true,
      images,
      // Retrocompatibilidade para chamadas de imagem única
      imageUrl: images[0].imageUrl,
      provider: images[0].provider,
      prompt: images[0].prompt,
      title: images[0].title,
      format: images[0].format,
      generatedAt: images[0].generatedAt,
    });
  } catch (error: any) {
    console.error('[Ad Studio Image Generation Error]:', error);
    res.status(500).json({ error: error?.message || 'Falha ao gerar imagem do anúncio.' });
  }
});

export default router;
