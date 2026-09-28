import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { generateText, generateImage } from '../services/aiProviderService';
import { writeAuditLog } from '../services/auditLog';
import { z } from 'zod';

const router = Router();
router.use(tenantMiddleware);

export interface SpecialistDefinition {
  id?: string;
  roleKey: string;
  name: string;
  title: string;
  avatarColor: string;
  iconName: string;
  provider: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  generateImage: boolean;
  isCustom: boolean;
  enabled: boolean;
}

export const DEFAULT_SQUAD_PERSONAS: SpecialistDefinition[] = [
  {
    roleKey: 'STRATEGIST',
    name: 'Dr. Arthur Valente',
    title: 'Estrategista Chefe & CMO',
    avatarColor: 'from-blue-600 to-indigo-600',
    iconName: 'BrainCircuit',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    generateImage: false,
    isCustom: false,
    enabled: true,
    systemPrompt: `Você é o Dr. Arthur Valente, Estrategista Chefe de Marketing e CMO.
Sua missão: Analisar o briefing do projeto, identificar o público-alvo prioritário, as principais dores/desejos e definir o posicionamento estratégico e os 3 ângulos centrais de conversão da campanha.
Seja direto, analítico e pragmático. Estruture sua resposta com:
1. 🎯 Tese Central & Posicionamento
2. 💡 3 Ângulos de Ataque Psicológico para a Campanha
3. 🧭 Direcionamento para a equipe de Copy e Arte.`
  },
  {
    roleKey: 'COPYWRITER',
    name: 'Camila Rocha',
    title: 'Copywriter Sênior de Resposta Direta',
    avatarColor: 'from-emerald-500 to-teal-600',
    iconName: 'PenTool',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    generateImage: false,
    isCustom: false,
    enabled: true,
    systemPrompt: `Você é Camila Rocha, Copywriter Sênior especialista em resposta direta, neuromarketing e conversão.
Sua missão: Com base na estratégia do Dr. Arthur e no briefing da sala, criar as peças de texto da campanha:
1. 💥 3 Opções de Títulos Magnéticos (Hooks de Alta Curiosidade)
2. 📝 2 Textos de Anúncios Principais (Framework AIDA e PAS)
3. 🎯 Chamadas para Ação (CTAs) irresistíveis.
Use linguagem persuasiva, gatilhos mentais e ritmo dinâmico.`
  },
  {
    roleKey: 'DESIGNER',
    name: 'Lucas Viana',
    title: 'Diretor de Arte & Designer Visual',
    avatarColor: 'from-purple-600 to-pink-600',
    iconName: 'Palette',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    generateImage: true,
    isCustom: false,
    enabled: true,
    systemPrompt: `Você é Lucas Viana, Diretor de Arte e Designer Visual de elite.
Sua missão: Ler as copys da Camila e a estratégia do Arthur para definir o conceito visual da campanha:
1. 🎨 Paleta de Cores e Estética Visual
2. 🖼️ Descrição Detalhada da Arte Principal (Layout, iluminação, foco visual)
3. 🤖 Prompt em Inglês para IA Geradora de Imagens (DALL-E 3 / Midjourney) estruturado entre as tags [IMAGE_PROMPT: seu prompt em inglês aqui].`
  },
  {
    roleKey: 'VIDEOMAKER',
    name: 'Gabriel Sato',
    title: 'Roteirista de Vídeos & Reels/TikTok',
    avatarColor: 'from-amber-500 to-orange-600',
    iconName: 'Video',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    generateImage: false,
    isCustom: false,
    enabled: true,
    systemPrompt: `Você é Gabriel Sato, Roteirista especializado em vídeos curtos virais (Reels, TikTok, Shorts).
Sua missão: Transformar as copys e a estratégia em um roteiro dinâmico de 30 a 45 segundos para gravação.
Estruture em tabela com:
- Tempo (Ex: 0-3s, 3-15s, 15-30s, 30-40s)
- Áudio / Fala do Apresentador
- Vídeo / O que aparece na tela (Texto flutuante, B-roll, transições).`
  },
  {
    roleKey: 'TRAFFIC_MANAGER',
    name: 'Renata Dias',
    title: 'Gestora de Tráfego & Mídia Paga',
    avatarColor: 'from-cyan-500 to-blue-600',
    iconName: 'TrendingUp',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    generateImage: false,
    isCustom: false,
    enabled: true,
    systemPrompt: `Você é Renata Dias, Gestora de Tráfego e Mídia Paga (Meta Ads & Google Ads).
Sua missão: Definir a estrutura técnica de distribuição de mídia para esta campanha:
1. 🎯 Públicos de Segmentação (Interesses, Lookalikes, Personalizados)
2. 💰 Distribuição de Orçamento recomendada (70% Topo de Funil, 30% Remarketing)
3. 📊 Métricas Chave (KPIs) para otimização nos primeiros 3 dias.`
  }
];

export async function getActiveSpecialistsForTenant(tenantId: string): Promise<SpecialistDefinition[]> {
  const dbSpecialists = await prisma.specialist.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' }
  });

  const customMap = new Map<string, SpecialistDefinition>();
  for (const item of dbSpecialists) {
    customMap.set(item.roleKey, {
      id: item.id,
      roleKey: item.roleKey,
      name: item.name,
      title: item.title,
      avatarColor: item.avatarColor,
      iconName: item.iconName,
      provider: item.provider,
      model: item.model,
      temperature: item.temperature,
      systemPrompt: item.systemPrompt,
      generateImage: item.generateImage,
      isCustom: item.isCustom,
      enabled: item.enabled
    });
  }

  const result: SpecialistDefinition[] = [];

  for (const def of DEFAULT_SQUAD_PERSONAS) {
    if (customMap.has(def.roleKey)) {
      const custom = customMap.get(def.roleKey)!;
      if (custom.enabled) result.push(custom);
      customMap.delete(def.roleKey);
    } else {
      result.push(def);
    }
  }

  // Adiciona especialistas 100% customizados criados pela agência
  for (const custom of customMap.values()) {
    if (custom.enabled) {
      result.push(custom);
    }
  }

  return result;
}

const specialistSchema = z.object({
  name: z.string().trim().min(2).max(120),
  roleKey: z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9_-]+$/, 'O identificador deve conter apenas letras, números, underline ou hífen.'),
  title: z.string().trim().min(2).max(150),
  avatarColor: z.string().trim().default('from-indigo-600 to-violet-600'),
  iconName: z.string().trim().default('BrainCircuit'),
  provider: z.enum(['openai', 'gemini', 'groq', 'ollama']).default('openai'),
  model: z.string().trim().min(1).max(100).default('gpt-4o'),
  temperature: z.number().min(0).max(1).default(0.7),
  systemPrompt: z.string().trim().min(10).max(10000),
  generateImage: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

// Listar todos os especialistas (Padrões + Customizados do Tenant)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const dbSpecialists = await prisma.specialist.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    const dbMap = new Map(dbSpecialists.map(s => [s.roleKey, s]));
    const list: any[] = [];

    for (const def of DEFAULT_SQUAD_PERSONAS) {
      if (dbMap.has(def.roleKey)) {
        list.push(dbMap.get(def.roleKey));
        dbMap.delete(def.roleKey);
      } else {
        list.push(def);
      }
    }

    for (const custom of dbMap.values()) {
      list.push(custom);
    }

    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo Especialista Customizado
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const parsed = specialistSchema.parse(req.body);

    const existing = await prisma.specialist.findFirst({
      where: { tenantId, roleKey: parsed.roleKey.toUpperCase() }
    });

    if (existing) {
      res.status(400).json({ error: `Já existe um especialista com a tag/identificador '${parsed.roleKey.toUpperCase()}'.` });
      return;
    }

    const specialist = await prisma.specialist.create({
      data: {
        tenantId,
        name: parsed.name,
        roleKey: parsed.roleKey.toUpperCase(),
        title: parsed.title,
        avatarColor: parsed.avatarColor,
        iconName: parsed.iconName,
        provider: parsed.provider,
        model: parsed.model,
        temperature: parsed.temperature,
        systemPrompt: parsed.systemPrompt,
        generateImage: parsed.generateImage,
        isCustom: true,
        enabled: parsed.enabled
      }
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'SPECIALIST_CREATED',
      entity: 'Specialist',
      entityId: specialist.id,
      metadata: { roleKey: specialist.roleKey, name: specialist.name }
    });

    res.status(201).json({ success: true, data: specialist });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao salvar especialista.' });
  }
});

// Atualizar Especialista (ou sobrescrever um padrão)
router.put('/:idOrRoleKey', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { idOrRoleKey } = req.params;
    const parsed = specialistSchema.partial().parse(req.body);

    let specialist = await prisma.specialist.findFirst({
      where: {
        tenantId,
        OR: [{ id: idOrRoleKey }, { roleKey: idOrRoleKey.toUpperCase() }]
      }
    });

    if (!specialist) {
      const defaultMatch = DEFAULT_SQUAD_PERSONAS.find(p => p.roleKey === idOrRoleKey.toUpperCase());
      if (defaultMatch) {
        specialist = await prisma.specialist.create({
          data: {
            tenantId,
            name: parsed.name || defaultMatch.name,
            roleKey: defaultMatch.roleKey,
            title: parsed.title || defaultMatch.title,
            avatarColor: parsed.avatarColor || defaultMatch.avatarColor,
            iconName: parsed.iconName || defaultMatch.iconName,
            provider: parsed.provider || defaultMatch.provider,
            model: parsed.model || defaultMatch.model,
            temperature: parsed.temperature ?? defaultMatch.temperature,
            systemPrompt: parsed.systemPrompt || defaultMatch.systemPrompt,
            generateImage: parsed.generateImage ?? defaultMatch.generateImage,
            isCustom: false,
            enabled: parsed.enabled ?? true
          }
        });
        res.json({ success: true, data: specialist });
        return;
      }

      res.status(404).json({ error: 'Especialista não encontrado.' });
      return;
    }

    const updated = await prisma.specialist.update({
      where: { id: specialist.id },
      data: {
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.title && { title: parsed.title }),
        ...(parsed.avatarColor && { avatarColor: parsed.avatarColor }),
        ...(parsed.iconName && { iconName: parsed.iconName }),
        ...(parsed.provider && { provider: parsed.provider }),
        ...(parsed.model && { model: parsed.model }),
        ...(parsed.temperature !== undefined && { temperature: parsed.temperature }),
        ...(parsed.systemPrompt && { systemPrompt: parsed.systemPrompt }),
        ...(parsed.generateImage !== undefined && { generateImage: parsed.generateImage }),
        ...(parsed.enabled !== undefined && { enabled: parsed.enabled })
      }
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'SPECIALIST_UPDATED',
      entity: 'Specialist',
      entityId: updated.id,
      metadata: { roleKey: updated.roleKey, name: updated.name }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(error?.name === 'ZodError' ? 400 : 500).json({ error: error?.message || 'Falha ao atualizar especialista.' });
  }
});

// Remover Especialista Customizado
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const specialist = await prisma.specialist.findFirst({
      where: { id, tenantId }
    });

    if (!specialist) {
      res.status(404).json({ error: 'Especialista não encontrado.' });
      return;
    }

    await prisma.specialist.delete({ where: { id: specialist.id } });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'SPECIALIST_DELETED',
      entity: 'Specialist',
      entityId: specialist.id,
      metadata: { roleKey: specialist.roleKey, name: specialist.name }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Playground / Teste Direto 1-a-1 com o Especialista
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { specialistId, roleKey, prompt, systemPrompt, provider, model, temperature } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Mensagem de teste obrigatória.' });
      return;
    }

    let resolvedPrompt = systemPrompt;
    let resolvedProvider = provider || 'openai';
    let resolvedModel = model || 'gpt-4o';
    let resolvedTemp = temperature ?? 0.7;
    let resolvedName = 'Especialista';

    if (specialistId || roleKey) {
      const all = await getActiveSpecialistsForTenant(tenantId);
      const match = all.find(s => s.id === specialistId || s.roleKey === (roleKey || '').toUpperCase());
      if (match) {
        resolvedPrompt = resolvedPrompt || match.systemPrompt;
        resolvedProvider = provider || match.provider;
        resolvedModel = model || match.model;
        resolvedTemp = temperature ?? match.temperature;
        resolvedName = match.name;
      }
    }

    if (!resolvedPrompt) {
      resolvedPrompt = 'Você é um assistente especialista experiente e direto.';
    }

    const completion = await generateText({
      provider: resolvedProvider,
      tenantId,
      taskType: 'war_room',
      model: resolvedModel,
      temperature: resolvedTemp,
      messages: [
        { role: 'system', content: resolvedPrompt },
        { role: 'user', content: prompt }
      ]
    });

    res.json({
      success: true,
      data: {
        specialistName: resolvedName,
        reply: completion.text,
        provider: completion.provider,
        model: resolvedModel
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
