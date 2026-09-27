import { Router, Request, Response } from 'express';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { PLAN_LIMITS } from '../config/planCatalog';

const router = Router();
router.use(tenantMiddleware);

router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, plan: true } });
    if (!tenant) { res.status(404).json({ error: 'Tenant não encontrado.' }); return; }

    const [agents, users, rooms, knowledge] = await Promise.all([
      prisma.agent.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId } }),
      prisma.room.count({ where: { tenantId } }),
      prisma.knowledgeFile.aggregate({ where: { tenantId }, _sum: { fileSize: true } }),
    ]);

    res.json({
      success: true,
      data: {
        tenant,
        usage: { agents, users, rooms, knowledgeBytes: knowledge._sum.fileSize || 0 },
        limits: PLAN_LIMITS[tenant.plan],
      },
    });
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar o resumo do tenant.' });
  }
});

export default router;
