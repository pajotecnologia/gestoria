import { Router, Request, Response } from 'express';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireRoles } from '../middlewares/authorization';
import { getAiUsageSummary } from '../services/aiUsage';

const router = Router();
router.use(tenantMiddleware);
router.use(requireRoles('AGENCY_ADMIN'));

router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Number(req.query.days || 30);
    const data = await getAiUsageSummary(req.tenantId!, Number.isFinite(days) ? days : 30);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar o consumo de IA.' });
  }
});

export default router;
