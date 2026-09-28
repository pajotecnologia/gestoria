import { z } from 'zod';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const registerSchema = z.object({
  agencyName: text(2, 120),
  name: text(2, 120),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const structureSchema = z.object({
  role: text(1, 10000),
  task: text(1, 10000),
  context: text(1, 20000),
  execution: text(1, 10000),
});

export const agentCreateSchema = z.object({
  name: text(2, 120).optional(),
  niche: text(2, 120).optional(),
  provider: z.enum(['openai', 'gemini', 'groq', 'ollama']).optional(),
  model: text(1, 120).optional(),
  temperature: z.number().min(0).max(2).optional(),
  structure: structureSchema,
  variables: z.record(z.union([z.string(), z.number()])).default({}),
  instanceName: z.string().trim().min(2).max(120).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export const agentUpdateSchema = agentCreateSchema.omit({ instanceName: true });

export const promptCompileSchema = z.object({
  agentId: z.string().uuid().optional(),
  templateName: text(1, 120).optional(),
  structure: structureSchema,
  variables: z.record(z.union([z.string(), z.number()])).default({}),
});

export const roomCreateSchema = z.object({
  title: text(2, 160),
  topic: text(2, 20000),
  targetAudience: z.string().trim().max(5000).optional(),
  objective: z.string().trim().max(5000).optional(),
});

export const roomMessageSchema = z.object({
  content: text(1, 10000),
});

export const debateRoundSchema = z.object({
  specificRole: z.enum(['STRATEGIST', 'COPYWRITER', 'DESIGNER', 'VIDEOMAKER', 'TRAFFIC_MANAGER']).optional(),
});

export const userCreateSchema = z.object({
  name: text(2, 120),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(['CLIENT_ADMIN', 'OPERATOR']).default('OPERATOR'),
});

export const userUpdateSchema = z.object({
  name: text(2, 120).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['CLIENT_ADMIN', 'OPERATOR']).optional(),
});
