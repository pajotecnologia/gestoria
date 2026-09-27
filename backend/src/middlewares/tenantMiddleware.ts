import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const JWT_SECRET = env.jwtSecret;

export interface JwtPayloadCustom {
  sub: string;
  tenantId: string;
  role: 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'CLIENT_ADMIN' | 'OPERATOR';
  email: string;
  iat?: number;
  exp?: number;
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token de autenticação ausente ou inválido.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadCustom;

    if (!decoded.tenantId || !decoded.sub) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Token inválido: identificador de tenant ausente.'
      });
      return;
    }

    // Injeção de contexto seguro para isolamento estrito de dados
    req.user = {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email
    };
    req.tenantId = decoded.tenantId;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Unauthorized', message: 'Token expirado.' });
      return;
    }
    logger.warn('authentication_failed', { reason: error.name });
    res.status(401).json({ error: 'Unauthorized', message: 'Assinatura do token inválida.' });
  }
};
