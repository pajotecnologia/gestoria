import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRoles(...roles: Array<keyof typeof Role>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Você não possui permissão para esta operação.' });
      return;
    }
    next();
  };
}
