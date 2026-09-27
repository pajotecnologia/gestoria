import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { generateEmbeddings } from '../services/aiProviderService';
import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { prisma } from './authRoutes';
import { env } from '../config/env';
import { assertPlanCapacity, PlanLimitError } from '../services/planLimits';
import { writeAuditLog } from '../services/auditLog';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

const qdrant = new QdrantClient({
  url: env.qdrantUrl,
  apiKey: env.qdrantApiKey || undefined,
});

const QDRANT_COLLECTION = env.qdrantCollection;

async function ensureCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === QDRANT_COLLECTION);
    
    if (!exists) {
      await qdrant.createCollection(QDRANT_COLLECTION, {
        vectors: { size: 1536, distance: 'Cosine' },
      });

      await qdrant.createPayloadIndex(QDRANT_COLLECTION, { field_name: 'tenantId', field_schema: 'keyword' });
      await qdrant.createPayloadIndex(QDRANT_COLLECTION, { field_name: 'agentId', field_schema: 'keyword' });
    }
  } catch (err: any) {
    console.warn('[Qdrant Warning] Não foi possível conectar ao Qdrant no momento:', err.message);
  }
}
ensureCollection();

function splitTextIntoChunks(text: string, chunkSize = 1000, chunkOverlap = 150): string[] {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < cleanText.length) {
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }
    const chunk = cleanText.substring(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    startIndex = endIndex - chunkOverlap;
  }
  return chunks;
}

router.post(
  '/upload-knowledge',
  tenantMiddleware,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId!;
      const agentId = req.body.agentId;
      const file = req.file;

      if (!agentId) {
        res.status(400).json({ error: 'Bad Request', message: 'agentId é obrigatório.' });
        return;
      }

      if (!file) {
        res.status(400).json({ error: 'Bad Request', message: 'Nenhum arquivo enviado.' });
        return;
      }

      const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId }, select: { id: true } });
      if (!agent) {
        res.status(404).json({ error: 'Not Found', message: 'Agente não encontrado ou não pertence a este tenant.' });
        return;
      }

      let extractedText = '';

      if (file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text;
      } else if (file.mimetype === 'text/plain') {
        extractedText = file.buffer.toString('utf-8');
      } else {
        res.status(400).json({ error: 'Bad Request', message: 'Formato inválido. Apenas PDF e TXT são permitidos.' });
        return;
      }

      if (!extractedText.trim()) {
        res.status(400).json({ error: 'Bad Request', message: 'O arquivo não contém texto legível.' });
        return;
      }

      await assertPlanCapacity(tenantId, 'knowledgeBytes', file.size);
      const chunks = splitTextIntoChunks(extractedText, 1000, 150);

      // Gera embeddings usando rotação automática de chaves OpenAI.
      const embeddings = await generateEmbeddings(chunks);

      const points = chunks.map((chunk, index) => {
        const pointId = crypto.randomUUID();
        return {
          id: pointId,
          vector: embeddings[index],
          payload: {
            tenantId,
            agentId,
            fileName: file.originalname,
            chunkIndex: index,
            totalChunks: chunks.length,
            content: chunk,
            createdAt: new Date().toISOString()
          }
        };
      });

      // Salva no Qdrant
      await qdrant.upsert(QDRANT_COLLECTION, {
        wait: true,
        points: points
      });

      // Salva referência do arquivo no banco PostgreSQL
      const knowledgeFile = await prisma.knowledgeFile.create({
        data: {
          tenantId,
          agentId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          chunksCount: points.length
        }
      });

      await writeAuditLog({ tenantId, userId: req.user?.userId, action: 'KNOWLEDGE_FILE_CREATED', entity: 'KnowledgeFile', entityId: knowledgeFile.id, metadata: { fileName: file.originalname, fileSize: file.size, chunks: points.length } });

      res.status(200).json({
        success: true,
        message: 'Base de conhecimento indexada com sucesso.',
        data: {
          fileName: file.originalname,
          chunksIndexed: points.length,
          tenantId,
          agentId
        }
      });
    } catch (error: any) {
      if (error instanceof PlanLimitError) { res.status(error.statusCode).json({ error: error.code, resource: error.resource, limit: error.limit, current: error.current }); return; }
      console.error('[RAG Service Error]:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
);

export default router;
