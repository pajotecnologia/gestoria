import { PlanType } from '@prisma/client';

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export type PlanLimits = {
  agents: number;
  users: number;
  rooms: number;
  knowledgeBytes: number;
};

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  TRIAL: { agents: 1, users: 1, rooms: 3, knowledgeBytes: 25 * MB },
  STARTER: { agents: 3, users: 5, rooms: 20, knowledgeBytes: 250 * MB },
  PRO: { agents: 10, users: 20, rooms: 100, knowledgeBytes: 2 * GB },
  ENTERPRISE: { agents: -1, users: -1, rooms: -1, knowledgeBytes: -1 },
};
