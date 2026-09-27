import { Request } from 'express';

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'CLIENT_ADMIN' | 'OPERATOR';
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TenantContext;
      tenantId?: string;
    }
  }
}
