import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Você não possui permissão para esta operação.' });
      return;
    }
    next();
  };
}
