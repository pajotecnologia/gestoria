import { describe, expect, it } from 'vitest';
import { getCampaignLifecycleStatus, validateCampaignPeriod } from '../src/services/campaignLifecycle';

describe('campaign lifecycle', () => {
  const date = (value: string) => new Date(value);

  it('supports independent campaign lifecycle states', () => {
    expect(getCampaignLifecycleStatus(false, null, null, date('2026-09-28T12:00:00Z'))).toBe('RASCUNHO');
    expect(getCampaignLifecycleStatus(false, date('2026-09-01T00:00:00Z'), date('2026-09-30T23:59:59Z'), date('2026-09-28T12:00:00Z'))).toBe('PAUSADA');
    expect(getCampaignLifecycleStatus(true, date('2026-10-01T00:00:00Z'), date('2026-10-31T23:59:59Z'), date('2026-09-28T12:00:00Z'))).toBe('AGENDADA');
  });

  it('recognizes active and ended campaigns from their period', () => {
    expect(getCampaignLifecycleStatus(true, date('2026-09-01T00:00:00Z'), date('2026-09-30T23:59:59Z'), date('2026-09-28T12:00:00Z'))).toBe('ATIVA');
    expect(getCampaignLifecycleStatus(true, date('2026-09-01T00:00:00Z'), date('2026-09-30T23:59:59Z'), date('2026-10-01T00:00:00Z'))).toBe('ENCERRADA');
  });

  it('rejects incomplete or inverted periods', () => {
    expect(validateCampaignPeriod(date('2026-09-01T00:00:00Z'), null)).toContain('inicial');
    expect(validateCampaignPeriod(date('2026-10-01T00:00:00Z'), date('2026-09-01T00:00:00Z'))).toContain('anterior');
    expect(validateCampaignPeriod(null, null)).toBeNull();
  });
});

  it('treats an exact end instant as still active', () => {
    const end = date('2026-09-30T23:59:59Z');
    expect(getCampaignLifecycleStatus(true, date('2026-09-01T00:00:00Z'), end, end)).toBe('ATIVA');
  });
