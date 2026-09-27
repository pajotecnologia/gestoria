import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from './authRoutes';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireRoles } from '../middlewares/authorization';
import { validateBody } from '../middlewares/validate';
import { userCreateSchema, userUpdateSchema } from '../validation/schemas';
import { assertPlanCapacity, PlanLimitError } from '../services/planLimits';
import { writeAuditLog } from '../services/auditLog';

const router = Router();
router.use(tenantMiddleware);
router.use(requireRoles('AGENCY_ADMIN'));

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.tenantId! },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: users });
});

router.post('/', validateBody(userCreateSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    await assertPlanCapacity(tenantId, 'users');
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: req.body.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    await writeAuditLog({ tenantId, userId: req.user?.userId, action: 'USER_CREATED', entity: 'User', entityId: user.id, metadata: { role: user.role } });
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      res.status(error.statusCode).json({ error: error.code, resource: error.resource, limit: error.limit, current: error.current });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'Email já cadastrado.' });
      return;
    }
    res.status(500).json({ error: 'Não foi possível criar o usuário.' });
  }
});

router.patch('/:id', validateBody(userUpdateSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.user?.userId && req.body.role) {
      res.status(400).json({ error: 'Não é permitido alterar a própria função administrativa.' });
      return;
    }
    const data: any = { name: req.body.name, role: req.body.role };
    if (req.body.password) data.passwordHash = await bcrypt.hash(req.body.password, 10);
    const updated = await prisma.user.updateMany({
      where: { id: req.params.id, tenantId: req.tenantId! },
      data,
    });
    if (!updated.count) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    await writeAuditLog({ tenantId: req.tenantId!, userId: req.user?.userId, action: 'USER_UPDATED', entity: 'User', entityId: req.params.id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  if (req.params.id === req.user?.userId) {
    res.status(400).json({ error: 'Não é permitido remover o próprio usuário.' });
    return;
  }
  const deleted = await prisma.user.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId! } });
  if (!deleted.count) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }
  await writeAuditLog({ tenantId: req.tenantId!, userId: req.user?.userId, action: 'USER_DELETED', entity: 'User', entityId: req.params.id });
  res.json({ success: true });
});

export default router;
