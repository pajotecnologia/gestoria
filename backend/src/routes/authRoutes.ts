import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authRateLimiter } from '../middlewares/rateLimit';
import { validateBody } from '../middlewares/validate';
import { loginSchema, registerSchema } from '../validation/schemas';

export const prisma = new PrismaClient();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET é obrigatório e deve possuir pelo menos 32 caracteres.');

// Registro de Nova Agência + Usuário Administrador
router.post('/register', authRateLimiter, validateBody(registerSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { agencyName, name, email, password } = req.body;

    if (!agencyName || !name || !email || !password) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email já cadastrado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: agencyName }
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          passwordHash,
          role: 'AGENCY_ADMIN'
        }
      });

      return { tenant, user };
    });

    const token = jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
        email: result.user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
      tenant: { id: result.tenant.id, name: result.tenant.name }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', authRateLimiter, validateBody(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    const token = jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
