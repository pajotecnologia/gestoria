import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { generateEmbeddings } from '../services/aiProviderService';
import { QdrantClient } from '@qdrant/js-client-rest';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { prisma } from './authRoutes';
import { env } from '../config/env';
import { assertPlanCapacity, PlanLimitError } from '../services/planLimits';
import { writeAuditLog } from '../services/auditLog';

const router = Router();
router.use(tenantMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const qdrant = new QdrantClient({
  url: env.qdrantUrl,
  apiKey: env.qdrantApiKey || undefined,
});

const QDRANT_COLLECTION = env.qdrantCollection;
const EMBEDDING_DIMENSIONS = 1536;

async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((collection) => collection.name === QDRANT_COLLECTION);

  if (!exists) {
    await qdrant.createCollection(QDRANT_COLLECTION, {
      vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
    });

    await Promise.all([
      qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: 'tenantId',
        field_schema: 'keyword',
      }),
      qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: 'agentId',
        field_schema: 'keyword',
      }),
      qdrant.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: 'knowledgeFileId',
        field_schema: 'keyword',
      }),
    ]);
  }
}

function splitTextIntoChunks(text: string, chunkSize = 1000, chunkOverlap = 150): string[] {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = Math.min(startIndex + chunkSize, cleanText.length);

    if (endIndex < cleanText.length) {
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);
      if (lastSpace > startIndex) endIndex = lastSpace;
    }

    const chunk = cleanText.substring(startIndex, endIndex).trim();
    if (chunk) chunks.push(chunk);

    const nextStart = endIndex - chunkOverlap;
    startIndex = nextStart > startIndex ? nextStart : endIndex;
  }

  return chunks;
}

function hashContent(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function qdrantUnavailable(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[RAG/Qdrant]', message);
  res.status(503).json({
    error: 'Knowledge Base Unavailable',
    message: 'A base vetorial não está disponível no momento. Verifique o serviço Qdrant.',
  });
}

router.post(
  '/upload-knowledge',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    let knowledgeFileId: string | null = null;

    try {
      const tenantId = req.tenantId!;
      const agentId = String(req.body.agentId || '').trim() || null;
      const clientId = String(req.body.clientId || '').trim() || null;
      const file = req.file;

      if (!agentId && !clientId) {
        res.status(400).json({ error: 'Bad Request', message: 'agentId ou clientId é obrigatório.' });
        return;
      }

      if (!file) {
        res.status(400).json({ error: 'Bad Request', message: 'Nenhum arquivo enviado.' });
        return;
      }

      if (agentId) {
        const agent = await prisma.agent.findFirst({
          where: { id: agentId, tenantId },
          select: { id: true },
        });
        if (!agent) {
          res.status(404).json({ error: 'Not Found', message: 'Agente não encontrado ou não pertence a este tenant.' });
          return;
        }
      }

      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, tenantId },
          select: { id: true },
        });
        if (!client) {
          res.status(404).json({ error: 'Not Found', message: 'Cliente/empresa não encontrado ou não pertence a este tenant.' });
          return;
        }
      }

      if (!['application/pdf', 'text/plain'].includes(file.mimetype)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Formato inválido. Apenas PDF e TXT são permitidos.',
        });
        return;
      }

      await assertPlanCapacity(tenantId, 'knowledgeBytes', file.size);

      const contentHash = hashContent(file.buffer);
      const duplicate = await prisma.knowledgeFile.findFirst({
        where: {
          tenantId,
          agentId,
          clientId,
          contentHash,
          status: 'READY',
        },
        select: { id: true, fileName: true },
      });

      if (duplicate) {
        res.status(409).json({
          error: 'Duplicate Knowledge File',
          message: 'Este arquivo já está indexado para este agente.',
          data: duplicate,
        });
        return;
      }

      let extractedText = '';
      if (file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text || '';
      } else {
        extractedText = file.buffer.toString('utf-8');
      }

      if (!extractedText.trim()) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'O arquivo não contém texto legível.',
        });
        return;
      }

      const chunks = splitTextIntoChunks(extractedText);
      if (!chunks.length) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Não foi possível gerar trechos de conhecimento.',
        });
        return;
      }

      const knowledgeFile = await prisma.knowledgeFile.create({
        data: {
          tenantId,
          agentId,
          clientId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          chunksCount: chunks.length,
          status: 'PROCESSING',
          extractedText,
          contentHash,
          embeddingModel: env.openaiEmbeddingModel,
        },
      });
      knowledgeFileId = knowledgeFile.id;

      await ensureCollection();
      const embeddings = await generateEmbeddings(chunks, tenantId);

      if (embeddings.length !== chunks.length || embeddings.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error('Dimensão dos embeddings incompatível com a coleção Qdrant.');
      }

      const points = chunks.map((chunk, index) => ({
        id: crypto.randomUUID(),
        vector: embeddings[index],
        payload: {
          tenantId,
          agentId,
          clientId,
          knowledgeFileId: knowledgeFile.id,
          fileName: file.originalname,
          chunkIndex: index,
          totalChunks: chunks.length,
          content: chunk,
          createdAt: new Date().toISOString(),
        },
      }));

      await qdrant.upsert(QDRANT_COLLECTION, { wait: true, points });

      await prisma.knowledgeFile.update({
        where: { id: knowledgeFile.id },
        data: { status: 'READY', errorMessage: null },
      });

      await writeAuditLog({
        tenantId,
        userId: req.user?.userId,
        action: 'KNOWLEDGE_FILE_CREATED',
        entity: 'KnowledgeFile',
        entityId: knowledgeFile.id,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          chunks: points.length,
          embeddingModel: env.openaiEmbeddingModel,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Base de conhecimento indexada com sucesso.',
        data: {
          id: knowledgeFile.id,
          fileName: file.originalname,
          chunksIndexed: points.length,
          tenantId,
          agentId,
          status: 'READY',
        },
      });
    } catch (error: any) {
      if (error instanceof PlanLimitError) {
        res.status(error.statusCode).json({
          error: error.code,
          resource: error.resource,
          limit: error.limit,
          current: error.current,
        });
        return;
      }

      if (knowledgeFileId) {
        await prisma.knowledgeFile.update({
          where: { id: knowledgeFileId },
          data: {
            status: 'ERROR',
            errorMessage: String(error?.message || error).slice(0, 1000),
          },
        }).catch(() => undefined);
      }

      if (error?.status === 502 || error?.status === 503 || /qdrant/i.test(String(error?.message || error))) {
        qdrantUnavailable(res, error);
        return;
      }

      console.error('[RAG Service Error]:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Não foi possível processar a base de conhecimento.',
      });
    }
  },
);

router.get('/knowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const files = await prisma.knowledgeFile.findMany({
      where: { tenantId: req.tenantId! },
      select: {
        id: true,
        agentId: true,
        clientId: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        chunksCount: true,
        status: true,
        errorMessage: true,
        embeddingModel: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: files });
  } catch (error: any) {
    res.status(500).json({ error: 'Não foi possível listar a base de conhecimento.' });
  }
});

router.post('/knowledge/:id/reprocess', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const file = await prisma.knowledgeFile.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!file) {
      res.status(404).json({ error: 'Arquivo de conhecimento não encontrado.' });
      return;
    }

    if (!file.extractedText?.trim()) {
      res.status(422).json({
        error: 'Knowledge Source Missing',
        message: 'Este registro não possui texto extraído para reprocessamento.',
      });
      return;
    }

    const chunks = splitTextIntoChunks(file.extractedText);
    await ensureCollection();

    await prisma.knowledgeFile.update({
      where: { id: file.id },
      data: {
        status: 'PROCESSING',
        errorMessage: null,
        chunksCount: chunks.length,
        embeddingModel: env.openaiEmbeddingModel,
      },
    });

    await qdrant.delete(QDRANT_COLLECTION, {
      wait: true,
      filter: { must: [{ key: 'knowledgeFileId', match: { value: file.id } }] },
    });

    const embeddings = await generateEmbeddings(chunks, tenantId);
    if (embeddings.length !== chunks.length || embeddings.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
      throw new Error('Dimensão dos embeddings incompatível com a coleção Qdrant.');
    }

    const points = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      vector: embeddings[index],
      payload: {
        tenantId,
        agentId: file.agentId,
        clientId: file.clientId,
        knowledgeFileId: file.id,
        fileName: file.fileName,
        chunkIndex: index,
        totalChunks: chunks.length,
        content: chunk,
        createdAt: new Date().toISOString(),
      },
    }));

    await qdrant.upsert(QDRANT_COLLECTION, { wait: true, points });

    await prisma.knowledgeFile.update({
      where: { id: file.id },
      data: { status: 'READY', errorMessage: null },
    });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'KNOWLEDGE_FILE_REPROCESSED',
      entity: 'KnowledgeFile',
      entityId: file.id,
      metadata: { chunks: points.length, embeddingModel: env.openaiEmbeddingModel },
    });

    res.json({ success: true, data: { id: file.id, chunksIndexed: points.length, status: 'READY' } });
  } catch (error: any) {
    await prisma.knowledgeFile.update({
      where: { id: req.params.id },
      data: { status: 'ERROR', errorMessage: String(error?.message || error).slice(0, 1000) },
    }).catch(() => undefined);

    if (/qdrant/i.test(String(error?.message || error))) {
      qdrantUnavailable(res, error);
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Não foi possível reprocessar a base de conhecimento.',
    });
  }
});

router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const agentId = String(req.body.agentId || '').trim() || null;
    const clientId = String(req.body.clientId || '').trim() || null;
    const query = String(req.body.query || '').trim();
    const requestedLimit = Number(req.body.limit || 5);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 5, 1), 10);

    if ((!agentId && !clientId) || !query) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Informe agentId ou clientId, além da consulta.',
      });
      return;
    }

    if (agentId) {
      const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId }, select: { id: true } });
      if (!agent) {
        res.status(404).json({ error: 'Agente não encontrado.' });
        return;
      }
    }

    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
      if (!client) {
        res.status(404).json({ error: 'Cliente/empresa não encontrado.' });
        return;
      }
    }

    await ensureCollection();
    const [queryVector] = await generateEmbeddings([query], tenantId);

    if (!queryVector || queryVector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error('Dimensão do embedding da consulta incompatível.');
    }

    const response = await qdrant.query(QDRANT_COLLECTION, {
      query: queryVector,
      limit,
      with_payload: true,
      filter: {
        must: [
          { key: 'tenantId', match: { value: tenantId } },
          ...(agentId ? [{ key: 'agentId', match: { value: agentId } }] : []),
          ...(clientId ? [{ key: 'clientId', match: { value: clientId } }] : []),
        ],
      },
    });

    res.json({
      success: true,
      data: (response.points || []).map((result: any) => ({
        score: result.score,
        content: typeof result.payload?.content === 'string' ? result.payload.content : '',
        fileName: result.payload?.fileName || null,
        knowledgeFileId: result.payload?.knowledgeFileId || null,
        clientId: result.payload?.clientId || null,
        chunkIndex: result.payload?.chunkIndex ?? null,
      })),
    });
  } catch (error: any) {
    if (/qdrant/i.test(String(error?.message || error))) {
      qdrantUnavailable(res, error);
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Não foi possível consultar a base de conhecimento.',
    });
  }
});

router.delete('/knowledge/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const file = await prisma.knowledgeFile.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, agentId: true, fileName: true },
    });

    if (!file) {
      res.status(404).json({ error: 'Arquivo de conhecimento não encontrado.' });
      return;
    }

    await ensureCollection();
    await qdrant.delete(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          { key: 'tenantId', match: { value: tenantId } },
          { key: 'knowledgeFileId', match: { value: file.id } },
        ],
      },
    });

    await prisma.knowledgeFile.delete({ where: { id: file.id } });

    await writeAuditLog({
      tenantId,
      userId: req.user?.userId,
      action: 'KNOWLEDGE_FILE_DELETED',
      entity: 'KnowledgeFile',
      entityId: file.id,
      metadata: { fileName: file.fileName },
    });

    res.json({ success: true });
  } catch (error: any) {
    if (/qdrant/i.test(String(error?.message || error))) {
      qdrantUnavailable(res, error);
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Não foi possível remover a base de conhecimento.',
    });
  }
});

export default router;
