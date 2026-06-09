import { Router } from 'express';
import { login, logout, validate } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators/schemas';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/validate', authMiddleware, validate);

export default router;
