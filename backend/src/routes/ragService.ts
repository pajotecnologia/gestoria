import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { prisma } from './authRoutes';
import { env } from '../config/env';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;
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

      const chunks = splitTextIntoChunks(extractedText, 1000, 150);

      if (!openai) {
        res.status(503).json({ error: 'Service Unavailable', message: 'OPENAI_API_KEY não configurada. A indexação RAG está indisponível.' });
        return;
      }

      // Gera embeddings em batch via OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks,
      });

      const points = chunks.map((chunk, index) => {
        const pointId = crypto.randomUUID();
        return {
          id: pointId,
          vector: embeddingResponse.data[index].embedding,
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
      await prisma.knowledgeFile.create({
        data: {
          tenantId,
          agentId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          chunksCount: points.length
        }
      });

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
      console.error('[RAG Service Error]:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
);

export default router;
