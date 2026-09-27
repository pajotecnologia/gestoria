import jwt from 'jsonwebtoken';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { Request, Response } from 'express';

const secret = 'phase-2-test-secret-with-at-least-32-chars';
let tenantMiddleware: typeof import('../src/middlewares/tenantMiddleware').tenantMiddleware;

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  tenantMiddleware = (await import('../src/middlewares/tenantMiddleware')).tenantMiddleware;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

const mockResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response as unknown as Response & { statusCode: number; body: unknown };
};

describe('tenant isolation middleware', () => {
  it('injects the tenant from the signed token', () => {
    const token = jwt.sign({ sub: 'user-1', tenantId: 'tenant-a', role: 'AGENCY_ADMIN', email: 'a@test.local' }, secret);
    const req = { headers: { authorization: 'Bearer ' + token } } as Request;
    const res = mockResponse();
    let nextCalled = false;

    tenantMiddleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.tenantId).toBe('tenant-a');
    expect(req.user?.tenantId).toBe('tenant-a');
  });

  it('rejects a token without tenant context', () => {
    const token = jwt.sign({ sub: 'user-1', role: 'AGENCY_ADMIN', email: 'a@test.local' }, secret);
    const req = { headers: { authorization: 'Bearer ' + token } } as Request;
    const res = mockResponse();
    let nextCalled = false;

    tenantMiddleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});