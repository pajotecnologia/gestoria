import { Router, Request, Response } from 'express';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { prisma } from '../routes/authRoutes';
import { handleWhatsAppSquadCommand } from '../services/whatsappSquadService';

const router = Router();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET || '';
if (process.env.NODE_ENV === 'production' && !EVOLUTION_WEBHOOK_SECRET) throw new Error('EVOLUTION_WEBHOOK_SECRET é obrigatório em produção.');
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ai-agent';

const redisConnection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  console.warn('[Redis Warning] Não foi possível conectar ao Redis no momento:', err.message);
});

export interface WebhookJobData {
  instanceName: string;
  senderRecipient: string; // Pode ser telefone ou ID de grupo (@g.us)
  messageText: string;
  messageId: string;
  pushName?: string;
  isGroup: boolean;
  receivedAt: number;
}

export const evolutionQueue = new Queue<WebhookJobData>('evolution-messages-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  }
});

export const evolutionWorker = new Worker<WebhookJobData>(
  'evolution-messages-queue',
  async (job: Job<WebhookJobData>) => {
    const { instanceName, senderRecipient, messageText, pushName, isGroup } = job.data;
    const userName = pushName || 'Membro do Grupo';

    try {
      // 1. Verifica se a mensagem é um comando do Squad de Marketing (!squad, @designer, @copywriter, etc.)
      const commandResult = await handleWhatsAppSquadCommand(
        instanceName,
        senderRecipient,
        messageText,
        userName
      );

      // Se foi um comando executado pelo Squad, encerra o processamento
      if (commandResult.handled) {
        return { status: 'command_handled', type: 'squad_command', recipient: senderRecipient };
      }

      // Se for grupo e não foi um comando explícito, ignora para não floodar o grupo
      if (isGroup) {
        return { status: 'group_message_ignored', reason: 'Nenhum comando acionado no grupo' };
      }

      // 2. Fluxo Normal de Atendimento do Agente de Conversão / RAG (para Leads no WhatsApp)
      const sessionId = `${instanceName}_${senderRecipient.replace('@s.whatsapp.net', '')}`;

      const agent = await prisma.agent.findFirst({
        where: { instanceName }
      });

      const n8nResponse = await axios.post(
        N8N_WEBHOOK_URL,
        {
          sessionId,
          instanceName,
          senderPhone: senderRecipient.replace('@s.whatsapp.net', ''),
          userName,
          userMessage: messageText,
          tenantId: agent?.tenantId || 'global',
          agentId: agent?.id || 'default',
          systemPrompt: agent?.fullSystemPrompt || ''
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000
        }
      );

      const aiReplyText = n8nResponse.data?.output || n8nResponse.data?.response || n8nResponse.data?.text;

      if (!aiReplyText) {
        return { status: 'skipped', reason: 'Nenhuma resposta gerada pelo fluxo n8n.' };
      }

      // Devolve a resposta via Evolution API
      await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
        {
          number: senderRecipient,
          text: aiReplyText,
          delay: 1200,
          linkPreview: false,
        },
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      return { status: 'success', recipient: senderRecipient, reply: aiReplyText };
    } catch (err: any) {
      console.error(`[Worker Error] Falha ao processar mensagem para ${senderRecipient}:`, err.message);
      throw err;
    }
  },
  { connection: redisConnection, concurrency: 10 }
);

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const providedSecret = req.header('x-webhook-secret') || '';
    if (!EVOLUTION_WEBHOOK_SECRET || providedSecret !== EVOLUTION_WEBHOOK_SECRET) {
      res.status(401).json({ error: 'Unauthorized', message: 'Webhook não autenticado.' }); return;
    }
    const body = req.body;

    if (body.event !== 'messages.upsert') {
      res.status(200).json({ received: true, ignoredEvent: body.event });
      return;
    }

    const messageData = body.data;
    const key = messageData?.key;
    const isFromMe = key?.fromMe;

    if (isFromMe) {
      res.status(200).json({ received: true, ignored: 'self_message' });
      return;
    }

    const instanceName = body.instance;
    const remoteJid = key?.remoteJid || '';
    const isGroup = remoteJid.endsWith('@g.us');
    const pushName = messageData?.pushName;

    const messageText =
      messageData?.message?.conversation ||
      messageData?.message?.extendedTextMessage?.text ||
      '';

    if (!messageText.trim()) {
      res.status(200).json({ received: true, ignored: 'empty_or_non_text_message' });
      return;
    }

    // Enfileira de forma assíncrona
    await evolutionQueue.add(
      'process-whatsapp-message',
      {
        instanceName,
        senderRecipient: remoteJid,
        messageText,
        messageId: key?.id || `${Date.now()}`,
        pushName,
        isGroup,
        receivedAt: Date.now()
      },
      { jobId: key?.id }
    );

    res.status(200).json({ status: 'queued', messageId: key?.id });
  } catch (error: any) {
    console.error('[Evolution Webhook Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
