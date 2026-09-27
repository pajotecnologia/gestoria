import { describe, expect, it } from 'vitest';
import { agentCreateSchema, loginSchema, roomMessageSchema } from '../src/validation/schemas';

describe('request validation', () => {
  it('normalizes login email and rejects weak passwords', () => {
    expect(loginSchema.parse({ email: ' USER@Example.COM ', password: '12345678' }).email).toBe('user@example.com');
    expect(loginSchema.safeParse({ email: 'user@example.com', password: '123' }).success).toBe(false);
  });

  it('rejects unsupported agent providers and invalid temperature', () => {
    const result = agentCreateSchema.safeParse({
      provider: 'unknown',
      temperature: 4,
      structure: { role: 'r', task: 't', context: 'c', execution: 'e' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty War Room messages', () => {
    expect(roomMessageSchema.safeParse({ content: '   ' }).success).toBe(false);
  });
});