import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRateLimiter } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import { env } from './config/env';
import { prisma } from './routes/authRoutes';

import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/agentRoutes';
import promptCompilerRoutes from './routes/promptCompiler';
import ragServiceRoutes from './routes/ragService';
import whatsappRoutes from './routes/whatsappRoutes';
import roomRoutes from './routes/roomRoutes';
import evolutionWebhookRoutes from './webhooks/evolutionWebhook';
import userRoutes from './routes/userRoutes';
import auditRoutes from './routes/auditRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais de Segurança e Parser
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = env.corsAllowedOrigins;
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('CORS origin não permitido.'));
} }));
app.use(apiRateLimiter);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Healthcheck
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', dependencies: { database: 'ok' } });
  } catch (error) {
    logger.error('readiness_failed', { dependency: 'database', error: error instanceof Error ? error.message : 'unknown' });
    res.status(503).json({ status: 'not_ready', dependencies: { database: 'unavailable' } });
  }
});

// Rotas da Aplicação
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/prompts', promptCompilerRoutes);
app.use('/api/rag', ragServiceRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/evolution', evolutionWebhookRoutes);

// Tratamento centralizado de erros
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, healthcheck: '/health' });
});
