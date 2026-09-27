import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { prisma } from './authRoutes';
import { validateBody } from '../middlewares/validate';
import { roomCreateSchema, roomMessageSchema, debateRoundSchema } from '../validation/schemas';
import { parsePagination } from '../utils/pagination';
import { assertPlanCapacity, PlanLimitError } from '../services/planLimits';
import { writeAuditLog } from '../services/auditLog';
import { env } from '../config/env';

const router = Router();
router.use(tenantMiddleware);

const openai = env.openaiApiKey
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface AgentPersona {
  roleKey: 'STRATEGIST' | 'COPYWRITER' | 'DESIGNER' | 'VIDEOMAKER' | 'TRAFFIC_MANAGER';
  name: string;
  title: string;
  avatarColor: string;
  systemPrompt: string;
}

export const SQUAD_PERSONAS: Record<string, AgentPersona> = {
  STRATEGIST: {
    roleKey: 'STRATEGIST',
    name: 'Dr. Arthur Valente',
    title: 'Estrategista Chefe & CMO',
    avatarColor: 'from-blue-600 to-indigo-600',
    systemPrompt: `Você é o Dr. Arthur Valente, Estrategista Chefe de Marketing e CMO.
Sua missão: Analisar o briefing do projeto, identificar o público-alvo prioritário, as principais dores/desejos e definir o posicionamento estratégico e os 3 ângulos centrais de conversão da campanha.
Seja direto, analítico e pragmático. Estruture sua resposta com:
1. 🎯 Tese Central & Posicionamento
2. 💡 3 Ângulos de Ataque Psicológico para a Campanha
3. 🧭 Direcionamento para a equipe de Copy e Arte.`
  },
  COPYWRITER: {
    roleKey: 'COPYWRITER',
    name: 'Camila Rocha',
    title: 'Copywriter Sênior de Resposta Direta',
    avatarColor: 'from-emerald-500 to-teal-600',
    systemPrompt: `Você é Camila Rocha, Copywriter Sênior especialista em resposta direta, neuromarketing e conversão.
Sua missão: Com base na estratégia do Dr. Arthur e no briefing da sala, criar as peças de texto da campanha:
1. 💥 3 Opções de Títulos Magnéticos (Hooks de Alta Curiosidade)
2. 📝 2 Textos de Anúncios Principais (Framework AIDA e PAS)
3. 🎯 Chamadas para Ação (CTAs) irresistíveis.
Use linguagem persuasiva, gatilhos mentais e ritmo dinâmico.`
  },
  DESIGNER: {
    roleKey: 'DESIGNER',
    name: 'Lucas Viana',
    title: 'Diretor de Arte & Designer Visual',
    avatarColor: 'from-purple-600 to-pink-600',
    systemPrompt: `Você é Lucas Viana, Diretor de Arte e Designer Visual de elite.
Sua missão: Ler as copys da Camila e a estratégia do Arthur para definir o conceito visual da campanha:
1. 🎨 Paleta de Cores e Estética Visual
2. 🖼️ Descrição Detalhada da Arte Principal (Layout, iluminação, foco visual)
3. 🤖 Prompt em Inglês para IA Geradora de Imagens (DALL-E 3 / Midjourney) estruturado entre as tags [IMAGE_PROMPT: seu prompt em inglês aqui].`
  },
  VIDEOMAKER: {
    roleKey: 'VIDEOMAKER',
    name: 'Gabriel Sato',
    title: 'Roteirista de Vídeos & Reels/TikTok',
    avatarColor: 'from-amber-500 to-orange-600',
    systemPrompt: `Você é Gabriel Sato, Roteirista especializado em vídeos curtos virais (Reels, TikTok, Shorts).
Sua missão: Transformar as copys e a estratégia em um roteiro dinâmico de 30 a 45 segundos para gravação.
Estruture em tabela com:
- Tempo (Ex: 0-3s, 3-15s, 15-30s, 30-40s)
- Áudio / Fala do Apresentador
- Vídeo / O que aparece na tela (Texto flutuante, B-roll, transições).`
  },
  TRAFFIC_MANAGER: {
    roleKey: 'TRAFFIC_MANAGER',
    name: 'Renata Dias',
    title: 'Gestora de Tráfego & Mídia Paga',
    avatarColor: 'from-cyan-500 to-blue-600',
    systemPrompt: `Você é Renata Dias, Gestora de Tráfego e Mídia Paga (Meta Ads & Google Ads).
Sua missão: Definir a estrutura técnica de distribuição de mídia para esta campanha:
1. 🎯 Públicos de Segmentação (Interesses, Lookalikes, Personalizados)
2. 💰 Distribuição de Orçamento recomendada (70% Topo de Funil, 30% Remarketing)
3. 📊 Métricas Chave (KPIs) para otimização nos primeiros 3 dias.`
  }
};

// Listar todas as salas do Tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);
    const [rooms, total] = await prisma.$transaction([
      prisma.room.findMany({
        where: { tenantId },
        select: {
          id: true, tenantId: true, title: true, topic: true, targetAudience: true,
          objective: true, status: true, createdAt: true, updatedAt: true,
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.room.count({ where: { tenantId } }),
    ]);
    res.json({ success: true, data: rooms, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar nova Sala de Reunião
router.post('/', validateBody(roomCreateSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { title, topic, targetAudience, objective } = req.body;
    await assertPlanCapacity(tenantId, 'rooms');

    if (!title || !topic) {
      res.status(400).json({ error: 'Título e Tópico/Briefing são obrigatórios.' });
      return;
    }

    const room = await prisma.room.create({
      data: {
        tenantId,
        title,
        topic,
        targetAudience: targetAudience || '',
        objective: objective || '',
        messages: {
          create: {
            senderType: 'USER',
            agentRole: 'HUMAN',
            senderName: req.user?.email || 'Gestor da Agência',
            content: `📢 **BRIEFING INICIAL DO PROJETO:**\n\n**Projeto:** ${title}\n**Objetivo:** ${objective || topic}\n**Público-Alvo:** ${targetAudience || 'A definir pelo Estrategista'}\n\n*Squad, por favor iniciem o planejamento multidisciplinar da campanha.*`
          }
        }
      },
      include: { messages: true }
    });

    await writeAuditLog({ tenantId, userId: req.user?.userId, action: 'ROOM_CREATED', entity: 'Room', entityId: room.id });
    res.status(201).json({ success: true, data: room });
  } catch (error: any) {
    if (error instanceof PlanLimitError) { res.status(error.statusCode).json({ error: error.code, resource: error.resource, limit: error.limit, current: error.current }); return; }
    res.status(500).json({ error: error.message });
  }
});

// Obter detalhes de uma sala e histórico de mensagens
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const room = await prisma.room.findFirst({
      where: { id, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 500 }
      }
    });

    if (!room) {
      res.status(404).json({ error: 'Sala de reunião não encontrada.' });
      return;
    }

    room.messages.reverse();
    res.json({ success: true, data: room });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Usuário envia mensagem / feedback na sala
router.post('/:id/message', validateBody(roomMessageSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { content } = req.body;

    const room = await prisma.room.findFirst({ where: { id, tenantId } });
    if (!room) {
      res.status(404).json({ error: 'Sala não encontrada.' });
      return;
    }

    const message = await prisma.roomMessage.create({
      data: {
        roomId: id,
        senderType: 'USER',
        agentRole: 'HUMAN',
        senderName: req.user?.email || 'Gestor da Agência',
        content
      }
    });

    await prisma.room.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Orquestrador do Debate em Rodada do Squad (Estrategista -> Copywriter -> Designer com DALL-E -> Videomaker -> Tráfego)
router.post('/:id/debate-round', validateBody(debateRoundSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { specificRole } = req.body; // Se preenchido, apenas um agente responde. Se vazio, o squad inteiro colabora.

    const room = await prisma.room.findFirst({
      where: { id, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 500 }
      }
    });

    if (!room) {
      res.status(404).json({ error: 'Sala não encontrada.' });
      return;
    }

    room.messages.reverse();

    // Papéis a serem executados na rodada
    const rolesToExecute: Array<keyof typeof SQUAD_PERSONAS> = specificRole
      ? [specificRole]
      : ['STRATEGIST', 'COPYWRITER', 'DESIGNER', 'VIDEOMAKER', 'TRAFFIC_MANAGER'];

    if (!openai) {
      res.status(503).json({ error: 'OPENAI_API_KEY não configurada. O War Room de IA está indisponível.' });
      return;
    }

    const newMessages = [];

    // Carrega histórico para contexto da conversa
    let conversationHistory = room.messages.map(m => `[${m.senderName} (${m.agentRole})]:\n${m.content}`).join('\n\n');

    for (const roleKey of rolesToExecute) {
      const persona = SQUAD_PERSONAS[roleKey];
      if (!persona) continue;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [
          { role: 'system', content: persona.systemPrompt },
          {
            role: 'user',
            content: `### BRIEFING DA SALA:
Título: ${room.title}
Tópico/Briefing: ${room.topic}
Público-Alvo: ${room.targetAudience || 'Geral'}
Objetivo: ${room.objective || 'Geral'}

### HISTÓRICO DA DISCUSSÃO ATÉ AGORA:
${conversationHistory}

Agora é a sua vez de contribuir, ${persona.name}. Construa suas ideias integrando o que seus colegas especialistas acima já propuseram.`
          }
        ]
      });

      let content = completion.choices[0].message?.content || '';
      let generatedImageUrl: string | null = null;

      // Se for o Designer e tiver gerado prompt de imagem, chama DALL-E 3
      if (roleKey === 'DESIGNER') {
        const promptMatch = content.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/i);
        if (promptMatch && promptMatch[1]) {
          const imagePrompt = promptMatch[1].trim();
          try {
            const imageResponse = await openai.images.generate({
              model: 'dall-e-3',
              prompt: imagePrompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard'
            });
            generatedImageUrl = imageResponse.data?.[0]?.url || null;
          } catch (imgErr: any) {
            console.warn('[DALL-E 3 Warning]: Não foi possível gerar a imagem:', imgErr.message);
          }
        }
      }

      const savedMessage = await prisma.roomMessage.create({
        data: {
          roomId: id,
          senderType: 'AGENT',
          agentRole: persona.roleKey,
          senderName: persona.name,
          content,
          imageUrl: generatedImageUrl
        }
      });

      newMessages.push(savedMessage);

      // Atualiza o histórico em memória para o próximo agente da rodada poder ler
      conversationHistory += `\n\n[${persona.name} (${persona.roleKey})]:\n${content}`;
    }

    await prisma.room.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.status(200).json({ success: true, data: newMessages });
  } catch (error: any) {
    console.error('[War Room Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exportar Relatório Consolidado do Plano de Ação
router.get('/:id/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const room = await prisma.room.findFirst({
      where: { id, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!room) {
      res.status(404).json({ error: 'Sala não encontrada.' });
      return;
    }

    let markdownPlan = `# 📑 PLANO DE AÇÃO CONSOLIDADO - ${room.title.toUpperCase()}\n\n`;
    markdownPlan += `**Data:** ${new Date().toLocaleDateString('pt-BR')}\n`;
    markdownPlan += `**Briefing:** ${room.topic}\n`;
    markdownPlan += `**Público-Alvo:** ${room.targetAudience || 'Não especificado'}\n`;
    markdownPlan += `**Objetivo:** ${room.objective || 'Não especificado'}\n\n`;
    markdownPlan += `---\n\n`;

    for (const msg of room.messages) {
      markdownPlan += `### 👤 ${msg.senderName} (${msg.agentRole})\n\n`;
      markdownPlan += `${msg.content}\n\n`;
      if (msg.imageUrl) {
        markdownPlan += `![Arte Gerada para a Campanha](${msg.imageUrl})\n\n`;
      }
      markdownPlan += `---\n\n`;
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Plano_Campanha_${room.id}.md"`);
    res.send(markdownPlan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
