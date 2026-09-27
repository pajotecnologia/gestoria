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
