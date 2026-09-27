import { describe, expect, it } from 'vitest';
import { PLAN_LIMITS } from '../src/config/planCatalog';

describe('AI monthly plan limits', () => {
  it('defines bounded limits for paid plans and unlimited enterprise', () => {
    expect(PLAN_LIMITS.TRIAL.aiRequestsMonthly).toBe(100);
    expect(PLAN_LIMITS.STARTER.aiRequestsMonthly).toBe(1000);
    expect(PLAN_LIMITS.PRO.aiRequestsMonthly).toBe(5000);
    expect(PLAN_LIMITS.ENTERPRISE.aiRequestsMonthly).toBe(-1);
  });
});
