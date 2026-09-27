import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: 'Not Found', message: 'Rota inexistente.' });
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const err = error as Error & { statusCode?: number; code?: string };
  logger.error('request_failed', { method: req.method, path: req.originalUrl, statusCode: err.statusCode || 500, error: err.message });

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Conflict', message: 'Registro duplicado.' });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Not Found', message: 'Registro não encontrado.' });
      return;
    }
  }

  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message: statusCode >= 500 ? 'Ocorreu um erro interno.' : err.message,
    ...(err.code ? { code: err.code } : {}),
  });
};