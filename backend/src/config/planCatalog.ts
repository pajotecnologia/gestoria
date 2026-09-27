import { PlanType } from '@prisma/client';

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export type PlanLimits = {
  agents: number;
  users: number;
  rooms: number;
  knowledgeBytes: number;
  aiRequestsMonthly: number;
};

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  TRIAL: { agents: 1, users: 1, rooms: 3, knowledgeBytes: 25 * MB, aiRequestsMonthly: 100 },
  STARTER: { agents: 3, users: 5, rooms: 20, knowledgeBytes: 250 * MB, aiRequestsMonthly: 1000 },
  PRO: { agents: 10, users: 20, rooms: 100, knowledgeBytes: 2 * GB, aiRequestsMonthly: 5000 },
  ENTERPRISE: { agents: -1, users: -1, rooms: -1, knowledgeBytes: -1, aiRequestsMonthly: -1 },
};
