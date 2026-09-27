import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRateLimiter } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/agentRoutes';
import promptCompilerRoutes from './routes/promptCompiler';
import ragServiceRoutes from './routes/ragService';
import whatsappRoutes from './routes/whatsappRoutes';
import roomRoutes from './routes/roomRoutes';
import evolutionWebhookRoutes from './webhooks/evolutionWebhook';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais de Segurança e Parser
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('CORS origin não permitido.'));
} }));
app.use(apiRateLimiter);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Rotas da Aplicação
app.use('/api/auth', authRoutes);
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
  console.log(`🚀 [Backend SaaS Agentes IA] rodando na porta ${PORT}`);
  console.log(`👉 Health Check: http://localhost:${PORT}/health`);
});
