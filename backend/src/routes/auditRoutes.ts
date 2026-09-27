import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireRoles } from '../middlewares/authorization';
import { parsePagination } from '../utils/pagination';

const router = Router();
router.use(tenantMiddleware);
router.use(requireRoles('AGENCY_ADMIN'));

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>);
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: { tenantId },
        select: { id: true, userId: true, action: true, entity: true, entityId: true, metadata: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where: { tenantId } }),
    ]);
    res.json({ success: true, data: logs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar a auditoria.' });
  }
});

export default router;
