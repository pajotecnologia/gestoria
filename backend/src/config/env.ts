const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + ' é obrigatório.');
  return value;
};

export const env = {
  jwtSecret: required('JWT_SECRET'),
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
  openaiApiKeys: (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || '').split(',').map((key) => key.trim()).filter(Boolean),
  groqApiKeys: (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map((key) => key.trim()).filter(Boolean),
  ollamaUrls: (process.env.OLLAMA_URLS || process.env.OLLAMA_URL || 'http://localhost:11434').split(',').map((url) => url.trim()).filter(Boolean),
  aiFallbackOrder: (process.env.AI_FALLBACK_ORDER || 'openai,groq,ollama').split(',').map((provider) => provider.trim().toLowerCase()).filter(Boolean),
  evolutionWebhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET?.trim() || null,
  qdrantUrl: process.env.QDRANT_URL?.trim() || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY?.trim() || null,
  qdrantCollection: process.env.QDRANT_COLLECTION?.trim() || 'agency_saas_knowledge_base',
};

if (env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET deve possuir pelo menos 32 caracteres.');
}

if (process.env.NODE_ENV === 'production' && !env.evolutionWebhookSecret) {
  throw new Error('EVOLUTION_WEBHOOK_SECRET é obrigatório em produção.');
}
