import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../routes/authRoutes';
import { decryptCredential } from './aiCredentialCrypto';

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

function isAvailable(provider: AiProvider, value: string): boolean {
  return (cooldownUntil.get(provider + ':' + value.slice(-16)) || 0) <= Date.now();
}

function markCapacity(provider: AiProvider, value: string): void {
  cooldownUntil.set(provider + ':' + value.slice(-16), Date.now() + 60_000);
}

async function callChat(provider: AiProvider, value: string, options: ChatOptions): Promise<string> {
  if (provider === 'ollama') {
    const response = await axios.post(value.replace(/\/$/, '') + '/api/chat', {
      model: options.model || 'llama3.1',
      messages: options.messages,
      stream: false,
      options: { temperature: options.temperature ?? 0.7 },
    }, { timeout: 60_000 });
    return response.data?.message?.content || response.data?.response || '';
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
  return completion.choices[0]?.message?.content || '';
}

export async function generateText(options: ChatOptions): Promise<{ text: string; provider: AiProvider }> {
  const errors: string[] = [];

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
        if (!isAvailable(provider, value)) continue;
        const text = await callChat(provider, value, { ...options, model: account.model });
        if (!text.trim()) throw new Error('Provedor retornou resposta vazia.');
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date(), lastError: null } });
        return { text, provider };
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity(provider, account.id);
        await prisma.aiProviderAccount.update({ where: { id: account.id }, data: { lastError: String(error?.message || error).slice(0, 500) } }).catch(() => undefined);
        errors.push(account.name + ': ' + String(error?.message || error));
      }
    }
  }

  for (const provider of candidates(options.provider)) {
    const attempts = Math.max(1, keyList(provider).length);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const value = nextValue(provider);
      if (!value || !isAvailable(provider, value)) continue;
      try {
        const text = await callChat(provider, value, options);
        if (!text.trim()) throw new Error('Provedor retornou resposta vazia.');
        return { text, provider };
      } catch (error: any) {
        if (isCapacityError(error)) markCapacity(provider, value);
        errors.push(provider + ': ' + String(error?.message || error));
      }
    }
  }
  throw new Error('Nenhum provedor de IA disponível. ' + errors.join(' | '));
}

export async function generateEmbeddings(input: string[]): Promise<number[][]> {
  const errors: string[] = [];
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
  throw new Error('Nenhuma chave OpenAI disponível para embeddings. ' + errors.join(' | '));
}
