import { Router, Request, Response } from 'express';
import axios from 'axios';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { prisma } from './authRoutes';
import { env } from '../config/env';

const router = Router();
router.use(tenantMiddleware);

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL?.trim();
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY?.trim();
const EVOLUTION_WEBHOOK_SECRET = env.evolutionWebhookSecret || '';

const evoClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
  timeout: 10000
});

// Criar instância e requisitar QR Code
router.post('/connect/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_WEBHOOK_SECRET) { res.status(503).json({ error: 'Evolution API não está configurada corretamente.' }); return; }
    const tenantId = req.tenantId!;
    const { agentId } = req.params;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId } });
    if (!agent) {
      res.status(404).json({ error: 'Agente não encontrado.' });
      return;
    }

    const instanceName = agent.instanceName || `agent_${agent.id.replace(/-/g, '_')}`;

    // 1. Tenta criar a instância na Evolution API caso não exista
    try {
      await evoClient.post('/instance/create', {
        instanceName,
        token: `${tenantId}_token`,
        qrcode: true,
        webhook: `${process.env.APP_BACKEND_URL || 'http://backend:3000'}/api/evolution/webhook`,
        webhook_by_events: true,
        headers: { 'x-webhook-secret': EVOLUTION_WEBHOOK_SECRET },
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
      });
    } catch (e: any) {
      // Instância já existe ou já foi criada
    }

    // 2. Obtém o QR Code em Base64
    const qrResponse = await evoClient.get(`/instance/connect/${instanceName}`);

    res.json({
      success: true,
      instanceName,
      qrcode: qrResponse.data?.base64 || qrResponse.data?.code,
      pairingCode: qrResponse.data?.pairingCode
    });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Checar Status de Conexão
router.get('/status/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) { res.status(503).json({ error: 'Evolution API não está configurada.' }); return; }
    const tenantId = req.tenantId!;
    const { agentId } = req.params;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId } });
    if (!agent || !agent.instanceName) {
      res.status(404).json({ error: 'Instância não inicializada para o agente.' });
      return;
    }

    const statusRes = await evoClient.get(`/instance/connectionState/${agent.instanceName}`);
    const state = statusRes.data?.instance?.state || 'close'; // 'open', 'connecting', 'close'

    const dbStatus = state === 'open' ? 'CONNECTED' : state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';
    await prisma.agent.update({
      where: { id: agent.id },
      data: { whatsappStatus: dbStatus }
    });

    res.json({ success: true, state, dbStatus });
  } catch (error: any) {
    res.json({ success: false, state: 'DISCONNECTED', dbStatus: 'DISCONNECTED' });
  }
});

export default router;
