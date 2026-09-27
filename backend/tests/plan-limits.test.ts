import { describe, expect, it } from 'vitest';
import { PLAN_LIMITS } from '../src/config/planCatalog';

describe('plan limits', () => {
  it('keeps explicit capacities for paid plans and unlimited enterprise', () => {
    expect(PLAN_LIMITS.TRIAL.agents).toBe(1);
    expect(PLAN_LIMITS.STARTER.users).toBe(5);
    expect(PLAN_LIMITS.PRO.rooms).toBe(100);
    expect(PLAN_LIMITS.ENTERPRISE.agents).toBe(-1);
    expect(PLAN_LIMITS.ENTERPRISE.knowledgeBytes).toBe(-1);
  });
});
