import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../routes/authRoutes';
import { decryptCredential } from './aiCredentialCrypto';
import { createAiRequest, finalizeAiRequest, recordAiUsage } from './aiUsage';
import { writeAuditLog } from './auditLog';

export type AiProvider = 'openai' | 'gemini' | 'groq' | 'ollama';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  provider?: string | null;
  model?: string | null;
  temperature?: number;
  messages: ChatMessage[];
  tenantId?: string;
  taskType?: 'chat' | 'embedding' | 'image' | 'rag' | 'war_room' | 'whatsapp';
}

const cooldownUntil = new Map<string, number>();
const keyCursor = new Map<string, number>();

function isCapacityError(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  const message = String(error?.message ?? error?.response?.data?.error?.message ?? '').toLowerCase();
  return status === 401 || status === 403 || status === 429 ||
    /quota|credit|billing|insufficient|rate.?limit|exceeded|payment|required/.test(message);
}

function candidates(preferred?: string | null): AiProvider[] {
  const validProviders: AiProvider[] = ['openai', 'gemini', 'groq', 'ollama'];
  const order = [...env.aiFallbackOrder, 'openai', 'gemini', 'groq', 'ollama']
    .filter((value, index, all) => all.indexOf(value) === index)
    .filter((value): value is AiProvider => validProviders.includes(value as AiProvider));
  return preferred && validProviders.includes(preferred as AiProvider)
    ? [preferred as AiProvider, ...order.filter((p) => p !== preferred)]
    : order;
}

function keyList(provider: AiProvider): string[] {
  if (provider === 'openai') return env.openaiApiKeys;
  if (provider === 'gemini') return env.geminiApiKeys;
  if (provider === 'groq') return env.groqApiKeys;
  return env.ollamaUrls;
}

function nextValue(provider: AiProvider): string | null {
  const values = keyList(provider);
  if (!values.length) return null;
  const cursor = keyCursor.get(provider) || 0;
  const value = values[cursor % values.length];
  keyCursor.set(provider, (cursor + 1) % values.length);
  return value;
}

function cooldownKey(provider: AiProvider, identity: string): string {
  return provider + ':' + identity.slice(-32);
}

function isAvailable(provider: AiProvider, identity: string): boolean {
  return (cooldownUntil.get(cooldownKey(provider, identity)) || 0) <= Date.now();
}

function markCapacity(provider: AiProvider, identity: string): void {
  cooldownUntil.set(cooldownKey(provider, identity), Date.now() + 60_000);
}

export async function callChat(provider: AiProvider, value: string, options: ChatOptions): Promise<{ text: string; inputTokens: number; outputTokens: number; totalTokens: number }> {
  if (provider === 'ollama') {
    let baseUrl = value.trim();
    let authToken = '';

    if (baseUrl.includes('|')) {
      const parts = baseUrl.split('|');
      baseUrl = parts[0].trim();
      authToken = parts[1].trim();
    } else if (baseUrl.includes('###')) {
      const parts = baseUrl.split('###');
      baseUrl = parts[0].trim();
      authToken = parts[1].trim();
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Try standard Ollama path first, then OpenWebUI Ollama proxy, then OpenAI compatible v1
    const candidateEndpoints = [
      cleanBaseUrl.endsWith('/api/chat') ? cleanBaseUrl : `${cleanBaseUrl}/api/chat`,
      `${cleanBaseUrl}/ollama/api/chat`,
      `${cleanBaseUrl}/api/v1/chat/completions`
    ];

    let lastError: any = null;
    for (const endpoint of candidateEndpoints) {
      try {
        if (endpoint.includes('/chat/completions')) {
          // OpenAI compatible format
          const response = await axios.post(endpoint, {
            model: options.model || 'llama3.1',
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
          }, { headers, timeout: 60_000 });
          const text = response.data?.choices?.[0]?.message?.content || '';
          const inputTokens = Number(response.data?.usage?.prompt_tokens || 0);
          const outputTokens = Number(response.data?.usage?.completion_tokens || 0);
          return { text, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
        } else {
          // Ollama format
          const response = await axios.post(endpoint, {
            model: options.model || 'llama3.1',
            messages: options.messages,
            stream: false,
            options: { temperature: options.temperature ?? 0.7 },
          }, { headers, timeout: 60_000 });
          const text = response.data?.message?.content || response.data?.response || '';
          const inputTokens = Number(response.data?.prompt_eval_count || 0);
          const outputTokens = Number(response.data?.eval_count || 0);
          return { text, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
        }
      } catch (err: any) {
        lastError = err;
        // If it's a 404 or 405 or HTML response, try next candidate endpoint
        if (err?.response?.status === 404 || err?.response?.status === 405 || typeof err?.response?.data === 'string') {
          continue;
        }
        // If it's an auth error (401/403) or connection refused, throw immediately
        throw err;
      }
    }
    throw lastError || new Error('Não foi possível conectar ao endpoint Ollama/OpenWebUI especificado.');
  }

  const client = new OpenAI({
    apiKey: value,
    ...(provider === 'gemini'
      ? { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' }
      : provider === 'groq'
      ? { baseURL: 'https://api.groq.com/openai/v1' }
      : {}),
  });

  const defaultModel =
    provider === 'gemini'
      ? 'gemini-3.8-flash'
      : provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : 'gpt-4o';

  const modelToUse = options.model || defaultModel;

  // Handle Gemini model candidates if deprecated model name is passed
  const geminiCandidates = [
    modelToUse,
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest'
  ];

  if (provider === 'gemini') {
    let lastErr: any = null;
    for (const m of geminiCandidates) {
      try {
        const completion = await client.chat.completions.create({
          model: m,
          temperature: options.temperature ?? 0.7,
          messages: options.messages,
        });
        const text = completion.choices[0]?.message?.content || '';
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        return { text, inputTokens, outputTokens, totalTokens: completion.usage?.total_tokens || inputTokens + outputTokens };
      } catch (err: any) {
        lastErr = err;
        // If 404 (model not found/deprecated) or 503 (demand spike), try next candidate
        if (err?.status === 404 || err?.status === 503) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  const completion = await client.chat.completions.create({
    model: modelToUse,
    temperature: options.temperature ?? 0.7,
    messages: options.messages,
  });
  const text = completion.choices[0]?.message?.content || '';
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;
  return { text, inputTokens, outputTokens, totalTokens: completion.usage?.total_tokens || inputTokens + outputTokens };
}

export async function generateText(options: ChatOptions): Promise<{ text: string; provider: AiProvider }> {
  const errors: string[] = [];
  const requestId = options.tenantId ? await createAiRequest(options.tenantId, options.taskType || 'chat') : null;

  if (options.tenantId) {
    const accounts = await prisma.aiProviderAccount.findMany({
      where: { tenantId: options.tenantId, enabled: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    for (const account of accounts) {
      const provider = account.provider as AiProvider;
      if (!['openai', 'gemini', 'groq', 'ollama'].includes(provider)) continue;
      try {
        const value = decryptCredential(account.encryptedKey);
        if (!isAvailable(provider, `account:${account.id}`)) continue;
        const result = await callChat(provider, value, { ...options, model: account.model });
        if (!result.text.trim()) throw new Error('Provedor retornou resposta vazia.');
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, requestId, providerAccountId: account.id, provider, model: account.model, taskType: options.taskType || 'chat', inputTokens: result.inputTokens, outputTokens: result.outputTokens, totalTokens: result.totalTokens, success: true }).catch(() => undefined);
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date(), lastError: null } });
        if (options.tenantId && errors.length > 0) await writeAuditLog({ tenantId: options.tenantId, action: 'AI_PROVIDER_FALLBACK', entity: 'AiProviderAccount', entityId: null, metadata: { provider, taskType: options.taskType || 'chat' } }).catch(() => undefined);
        if (requestId) await finalizeAiRequest(requestId, { success: true, provider, model: account.model, totalTokens: result.totalTokens });
        return { text: result.text, provider };
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity(provider, `account:${account.id}`);
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastError: String(error?.message || error).slice(0, 500) } }).catch(() => undefined);
        errors.push(account.name + ': ' + String(error?.message || error));
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, providerAccountId: account.id, provider, model: account.model, taskType: options.taskType || 'chat', success: false, errorType: isCapacityError(error) ? 'CAPACITY' : 'PROVIDER_ERROR' }).catch(() => undefined);
      }
    }
  }

  for (const provider of candidates(options.provider)) {
    const attempts = Math.max(1, keyList(provider).length);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const value = nextValue(provider);
      if (!value || !isAvailable(provider, value)) continue;
      try {
        const result = await callChat(provider, value, options);
        if (!result.text.trim()) throw new Error('Provedor retornou resposta vazia.');
        const fallbackModel =
          provider === 'gemini'
            ? 'gemini-2.5-flash'
            : provider === 'groq'
            ? 'llama-3.3-70b-versatile'
            : provider === 'ollama'
            ? 'llama3.1'
            : 'gpt-4o';
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, requestId, provider, model: options.model || fallbackModel, taskType: options.taskType || 'chat', inputTokens: result.inputTokens, outputTokens: result.outputTokens, totalTokens: result.totalTokens, success: true }).catch(() => undefined);
        if (requestId) await finalizeAiRequest(requestId, { success: true, provider, model: options.model || fallbackModel, totalTokens: result.totalTokens });
        return { text: result.text, provider };
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity(provider, value);
        errors.push(provider + ': ' + String(error?.message || error));
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, requestId, provider, model: options.model || 'unknown', taskType: options.taskType || 'chat', success: false, errorType: isCapacityError(error) ? 'CAPACITY' : 'PROVIDER_ERROR' }).catch(() => undefined);
      }
    }
  }
  if (requestId) await finalizeAiRequest(requestId, { success: false });
  throw new Error('Nenhum provedor de IA disponível. ' + errors.join(' | '));
}

export async function generateEmbeddings(input: string[], tenantId?: string): Promise<number[][]> {
  if (!input.length) return [];

  const errors: string[] = [];
  const requestId = tenantId ? await createAiRequest(tenantId, 'rag') : null;
  const model = env.openaiEmbeddingModel;

  if (tenantId) {
    const accounts = await prisma.aiProviderAccount.findMany({
      where: { tenantId, enabled: true, provider: 'openai' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    for (const account of accounts) {
      try {
        const key = decryptCredential(account.encryptedKey);
        if (!isAvailable('openai', `account:${account.id}:embedding`)) continue;

        const client = new OpenAI({ apiKey: key });
        const response = await client.embeddings.create({ model, input });
        const embeddings = response.data.map((item) => item.embedding);
        const inputTokens = Number(response.usage?.prompt_tokens || 0);

        await prisma.aiProviderAccount.update({
          where: { id: account.id },
          data: { lastUsedAt: new Date(), lastError: null },
        });

        await recordAiUsage({
          tenantId,
          requestId,
          providerAccountId: account.id,
          provider: 'openai',
          model,
          taskType: 'rag',
          inputTokens,
          totalTokens: inputTokens,
          success: true,
        }).catch(() => undefined);

        if (requestId) {
          await finalizeAiRequest(requestId, {
            success: true,
            provider: 'openai',
            model,
            totalTokens: inputTokens,
          });
        }

        return embeddings;
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity('openai', `account:${account.id}:embedding`);
        const message = String(error?.message || error);
        errors.push(account.name + ': ' + message);

        await recordAiUsage({
          tenantId,
          requestId,
          providerAccountId: account.id,
          provider: 'openai',
          model,
          taskType: 'rag',
          success: false,
          errorType: isCapacityError(error) ? 'CAPACITY' : 'PROVIDER_ERROR',
        }).catch(() => undefined);

        await prisma.aiProviderAccount.update({
          where: { id: account.id },
          data: { lastError: message.slice(0, 500) },
        }).catch(() => undefined);
      }
    }
  }

  for (let attempt = 0; attempt < Math.max(1, env.openaiApiKeys.length); attempt++) {
    const key = nextValue('openai');
    if (!key || !isAvailable('openai', key)) continue;

    try {
      const client = new OpenAI({ apiKey: key });
      const response = await client.embeddings.create({ model, input });
      const embeddings = response.data.map((item) => item.embedding);

      if (requestId) {
        await finalizeAiRequest(requestId, {
          success: true,
          provider: 'openai',
          model,
          totalTokens: Number(response.usage?.prompt_tokens || 0),
        });
      }

      return embeddings;
    } catch (error: any) {
      if (isCapacityError(error)) markCapacity('openai', key);
      errors.push('openai: ' + String(error?.message || error));
    }
  }

  if (requestId) await finalizeAiRequest(requestId, { success: false });
  throw new Error('Nenhuma chave OpenAI disponível para embeddings. ' + errors.join(' | '));
}

const BRAZILIAN_COMMERCIAL_CATALOG = {
  kids: [
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289',
    'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368',
    'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9',
    'https://images.unsplash.com/photo-1516627145497-ae6968895b74',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
  ],
  people_brazil: [
    'https://images.unsplash.com/photo-1543269865-cbf427effbad',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7',
  ],
  business_brazil: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a',
  ],
  retail_brazil: [
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a',
  ],
  product_still: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
  ],
};

export async function generateImage(
  prompt: string,
  tenantId?: string,
  options?: { format?: '1:1' | '9:16' | '16:9'; seed?: number; visualStyle?: string }
): Promise<{ url: string; provider: string }> {
  const errors: string[] = [];
  const requestId = tenantId ? await createAiRequest(tenantId, 'image') : null;

  // Clean prompt for optimum generation
  const cleanPrompt = prompt.replace(/^["'\s]+|["'\s]+$/g, '').trim();

  // Dimensões otimizadas por formato
  const format = options?.format || '1:1';
  let dalleSize: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';

  if (format === '9:16') {
    dalleSize = '1024x1792';
  } else if (format === '16:9') {
    dalleSize = '1792x1024';
  }

  // 1. Prioridade para contas OpenAI do tenant
  if (tenantId) {
    const accounts = await prisma.aiProviderAccount.findMany({
      where: { tenantId, enabled: true, provider: 'openai' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    for (const account of accounts) {
      try {
        const key = decryptCredential(account.encryptedKey);
        if (!isAvailable('openai', `account:${account.id}:image`)) continue;
        const client = new OpenAI({ apiKey: key });
        const response = await client.images.generate({
          model: account.model || 'dall-e-3',
          prompt: cleanPrompt.slice(0, 1000),
          n: 1,
          size: dalleSize,
          quality: 'standard',
        });
        const url = response.data?.[0]?.url;
        if (!url) throw new Error('Provedor não retornou URL da imagem.');
        await prisma.aiProviderAccount.update({
          where: { id: account.id },
          data: { lastUsedAt: new Date(), lastError: null },
        });
        if (tenantId) await recordAiUsage({ tenantId, requestId, providerAccountId: account.id, provider: 'openai', model: account.model || 'dall-e-3', taskType: 'image', success: true }).catch(() => undefined);
        if (requestId) await finalizeAiRequest(requestId, { success: true, provider: 'openai', model: account.model || 'dall-e-3' });
        return { url, provider: 'dall-e-3' };
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity('openai', `account:${account.id}:image`);
        errors.push(account.name + ': ' + String(error?.message || error));
        await prisma.aiProviderAccount.update({
          where: { id: account.id },
          data: { lastError: String(error?.message || error).slice(0, 500) },
        }).catch(() => undefined);
      }
    }
  }

  // 2. Chaves OpenAI de ambiente
  for (const key of env.openaiApiKeys) {
    if (!isAvailable('openai', `env:${key}:image`)) continue;
    try {
      const client = new OpenAI({ apiKey: key });
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: cleanPrompt.slice(0, 1000),
        n: 1,
        size: dalleSize,
        quality: 'standard',
      });
      const url = response.data?.[0]?.url;
      if (!url) throw new Error('OpenAI não retornou URL da imagem.');
      return { url, provider: 'dall-e-3' };
    } catch (error: any) {
      if (isCapacityError(error)) markCapacity('openai', `env:${key}:image`);
      errors.push('openai: ' + String(error?.message || error));
    }
  }

  // 3. Motor de Fotografia Publicitária Brasileira em Alta Definição (1080p/4K)
  try {
    const visualStyle = options?.visualStyle || 'brazilian_people';
    const seed = options?.seed || Math.floor(Math.random() * 900000) + 100000;
    const lowerPrompt = cleanPrompt.toLowerCase();

    // Detecção contextual inteligente por tema do anúncio
    let category: keyof typeof BRAZILIAN_COMMERCIAL_CATALOG = 'people_brazil';

    if (visualStyle === 'product_only' || lowerPrompt.includes('produto') || lowerPrompt.includes('still')) {
      category = 'product_still';
    } else if (visualStyle === 'brazilian_business' || lowerPrompt.includes('negócio') || lowerPrompt.includes('b2b') || lowerPrompt.includes('empresa') || lowerPrompt.includes('corporativo')) {
      category = 'business_brazil';
    } else if (visualStyle === 'brazilian_retail' || lowerPrompt.includes('varejo') || lowerPrompt.includes('loja') || lowerPrompt.includes('promoção') || lowerPrompt.includes('compras')) {
      category = 'retail_brazil';
    } else if (lowerPrompt.includes('criança') || lowerPrompt.includes('infantil') || lowerPrompt.includes('kids') || lowerPrompt.includes('dia das crianças')) {
      category = 'kids';
    } else {
      category = 'people_brazil';
    }

    const pool = BRAZILIAN_COMMERCIAL_CATALOG[category];
    const pickedIndex = Math.abs(seed) % pool.length;
    const baseUrl = pool[pickedIndex];

    // Formata dimensões e cortes comerciais perfeitos
    let formatParams = 'w=1080&h=1080&fit=crop&crop=faces,center';
    if (format === '9:16') {
      formatParams = 'w=1080&h=1920&fit=crop&crop=faces,center';
    } else if (format === '16:9') {
      formatParams = 'w=1920&h=1080&fit=crop&crop=faces,center';
    }

    const commercialImageUrl = `${baseUrl}?auto=format&${formatParams}&q=85`;

    if (requestId) await finalizeAiRequest(requestId, { success: true, provider: 'ad_studio', model: 'commercial-photo-hd' });
    return { url: commercialImageUrl, provider: 'AdStudio Pro' };
  } catch (err: any) {
    if (requestId) await finalizeAiRequest(requestId, { success: false });
    throw new Error('Falha ao gerar arte publicitária. ' + err?.message);
  }
}
