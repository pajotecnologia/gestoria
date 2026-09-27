import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env';

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
  if (!preferred || !['openai', 'groq', 'ollama'].includes(preferred)) return order;
  return [preferred as AiProvider, ...order.filter((p) => p !== preferred)];
}

function nextKey(provider: AiProvider): string | null {
  const keys = provider === 'openai' ? env.openaiApiKeys : provider === 'groq' ? env.groqApiKeys : [];
  if (!keys.length) return null;
  const cursor = keyCursor.get(provider) || 0;
  const key = keys[cursor % keys.length];
  keyCursor.set(provider, (cursor + 1) % keys.length);
  return key;
}

function markCapacity(provider: AiProvider, key?: string | null): void {
  const suffix = key ? key.slice(-8) : 'default';
  cooldownUntil.set(provider + ':' + suffix, Date.now() + 60_000);
}

function available(provider: AiProvider, key?: string | null): boolean {
  const suffix = key ? key.slice(-8) : 'default';
  return (cooldownUntil.get(provider + ':' + suffix) || 0) <= Date.now();
}

async function callProvider(provider: AiProvider, options: ChatOptions): Promise<string> {
  if (provider === 'ollama') {
    const baseUrl = env.ollamaUrls[0];
    const response = await axios.post(baseUrl.replace(/\/$/, '') + '/api/chat', {
      model: options.model || 'llama3.1',
      messages: options.messages,
      stream: false,
      options: { temperature: options.temperature ?? 0.7 },
    }, { timeout: 60_000 });
    return response.data?.message?.content || response.data?.response || '';
  }

  const key = nextKey(provider);
  if (!key) throw new Error(provider.toUpperCase() + '_API_KEY não configurada.');
  if (!available(provider, key)) throw new Error(provider.toUpperCase() + ' key em cooldown.');

  const client = new OpenAI({
    apiKey: key,
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
  for (const provider of candidates(options.provider)) {
    try {
      const text = await callProvider(provider, options);
      if (!text.trim()) throw new Error('Provedor retornou resposta vazia.');
      return { text, provider };
    } catch (error: any) {
      if (isCapacityError(error)) {
        const key = provider === 'openai' ? env.openaiApiKeys[0] : provider === 'groq' ? env.groqApiKeys[0] : null;
        markCapacity(provider, key);
      }
      errors.push(provider + ': ' + String(error?.message || error));
    }
  }
  throw new Error('Nenhum provedor de IA disponível. ' + errors.join(' | '));
}

export async function generateEmbeddings(input: string[]): Promise<number[][]> {
  const errors: string[] = [];
  for (let attempt = 0; attempt < Math.max(1, env.openaiApiKeys.length); attempt++) {
    const key = nextKey('openai');
    if (!key || !available('openai', key)) continue;
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
