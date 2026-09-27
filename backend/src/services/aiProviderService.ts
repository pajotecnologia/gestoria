import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../routes/authRoutes';
import { decryptCredential } from './aiCredentialCrypto';
import { createAiRequest, finalizeAiRequest, recordAiUsage } from './aiUsage';
import { writeAuditLog } from './auditLog';

export type AiProvider = 'openai' | 'groq' | 'ollama';

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
  const order = [...env.aiFallbackOrder, 'openai', 'groq', 'ollama']
    .filter((value, index, all) => all.indexOf(value) === index)
    .filter((value): value is AiProvider => ['openai', 'groq', 'ollama'].includes(value));
  return preferred && ['openai', 'groq', 'ollama'].includes(preferred)
    ? [preferred as AiProvider, ...order.filter((p) => p !== preferred)]
    : order;
}

function keyList(provider: AiProvider): string[] {
  if (provider === 'openai') return env.openaiApiKeys;
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

async function callChat(provider: AiProvider, value: string, options: ChatOptions): Promise<{ text: string; inputTokens: number; outputTokens: number; totalTokens: number }> {
  if (provider === 'ollama') {
    const response = await axios.post(value.replace(/\/$/, '') + '/api/chat', {
      model: options.model || 'llama3.1',
      messages: options.messages,
      stream: false,
      options: { temperature: options.temperature ?? 0.7 },
    }, { timeout: 60_000 });
    const text = response.data?.message?.content || response.data?.response || '';
    const inputTokens = Number(response.data?.prompt_eval_count || 0);
    const outputTokens = Number(response.data?.eval_count || 0);
    return { text, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
  }

  const client = new OpenAI({
    apiKey: value,
    ...(provider === 'groq' ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
  });
  const completion = await client.chat.completions.create({
    model: options.model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o'),
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
      if (!['openai', 'groq', 'ollama'].includes(provider)) continue;
      try {
        const value = decryptCredential(account.encryptedKey);
        if (!isAvailable(provider, `account:${account.id}`)) continue;
        const result = await callChat(provider, value, { ...options, model: account.model });
        if (!result.text.trim()) throw new Error('Provedor retornou resposta vazia.');
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, requestId, providerAccountId: account.id, provider, model: account.model, taskType: options.taskType || 'chat', inputTokens: result.inputTokens, outputTokens: result.outputTokens, totalTokens: result.totalTokens, success: true }).catch(() => undefined);
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date(), lastError: null } });
        if (options.tenantId && errors.length > 0) await writeAuditLog({ tenantId: options.tenantId, action: 'AI_PROVIDER_FALLBACK', entity: 'AiProviderAccount', entityId: null, metadata: { provider, taskType: options.taskType || 'chat' } }).catch(() => undefined);
        if (requestId) await finalizeAiRequest(requestId, { success: true, provider, model: account.model, totalTokens: result.totalTokens });
        if (requestId) await finalizeAiRequest(requestId, { success: true, provider, model: options.model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'ollama' ? 'llama3.1' : 'gpt-4o'), totalTokens: result.totalTokens });
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
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, requestId, provider, model: options.model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'ollama' ? 'llama3.1' : 'gpt-4o'), taskType: options.taskType || 'chat', inputTokens: result.inputTokens, outputTokens: result.outputTokens, totalTokens: result.totalTokens, success: true }).catch(() => undefined);
        return { text: result.text, provider };
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity(provider, value);
        errors.push(provider + ': ' + String(error?.message || error));
        if (options.tenantId) await recordAiUsage({ tenantId: options.tenantId, provider, model: options.model || 'unknown', taskType: options.taskType || 'chat', success: false, errorType: isCapacityError(error) ? 'CAPACITY' : 'PROVIDER_ERROR' }).catch(() => undefined);
      }
    }
  }
  if (requestId) await finalizeAiRequest(requestId, { success: false });
  throw new Error('Nenhum provedor de IA disponível. ' + errors.join(' | '));
}

export async function generateEmbeddings(input: string[], tenantId?: string): Promise<number[][]> {
  const errors: string[] = [];
  const requestId = tenantId ? await createAiRequest(tenantId, 'rag') : null;

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
        const response = await client.embeddings.create({ model: account.model || 'text-embedding-3-small', input });
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date(), lastError: null } });
        if (tenantId) {
          const inputTokens = Number(response.usage?.prompt_tokens || 0);
          await recordAiUsage({ tenantId, requestId, providerAccountId: account.id, provider: 'openai', model: account.model || 'text-embedding-3-small', taskType: 'rag', inputTokens, totalTokens: inputTokens, success: true }).catch(() => undefined);
        }
        if (requestId) await finalizeAiRequest(requestId, { success: true, provider: 'openai', model: account.model || 'text-embedding-3-small', totalTokens: inputTokens });
        return response.data.map((item) => item.embedding);
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity('openai', `account:${account.id}:embedding`);
        errors.push(account.name + ': ' + String(error?.message || error));
        if (tenantId) await recordAiUsage({ tenantId, providerAccountId: account.id, provider: 'openai', model: account.model || 'text-embedding-3-small', taskType: 'rag', success: false, errorType: isCapacityError(error) ? 'CAPACITY' : 'PROVIDER_ERROR' }).catch(() => undefined);
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastError: String(error?.message || error).slice(0, 500) } }).catch(() => undefined);
      }
    }
  }

  const attempts = Math.max(1, env.openaiApiKeys.length);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const key = nextValue('openai');
    if (!key || !isAvailable('openai', key)) continue;
    try {
      const client = new OpenAI({ apiKey: key });
      const response = await client.embeddings.create({ model: 'text-embedding-3-small', input });
      return response.data.map((item) => item.embedding);
    } catch (error: any) {
      if (isCapacityError(error)) markCapacity('openai', key);
      errors.push(String(error?.message || error));
    }
  }
  if (requestId) await finalizeAiRequest(requestId, { success: false });
  throw new Error('Nenhuma chave OpenAI disponível para embeddings. ' + errors.join(' | '));
}

export async function generateImage(
  prompt: string,
  tenantId?: string
): Promise<{ url: string; provider: 'openai' }> {
  const errors: string[] = [];
  const requestId = tenantId ? await createAiRequest(tenantId, 'image') : null;

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
          prompt,
          n: 1,
          size: '1024x1024',
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
        return { url, provider: 'openai' };
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

  for (const key of env.openaiApiKeys) {
    if (!isAvailable('openai', `env:${key}:image`)) continue;
    try {
      const client = new OpenAI({ apiKey: key });
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });
      const url = response.data?.[0]?.url;
      if (!url) throw new Error('OpenAI não retornou URL da imagem.');
      return { url, provider: 'openai' };
    } catch (error: any) {
      if (isCapacityError(error)) markCapacity('openai', `env:${key}:image`);
      errors.push('openai: ' + String(error?.message || error));
    }
  }

  if (requestId) await finalizeAiRequest(requestId, { success: false });
  throw new Error('Nenhum provedor OpenAI disponível para geração de imagem. ' + errors.join(' | '));
}
