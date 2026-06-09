import { Router } from 'express';
import { createSubmission } from '../controllers/submission';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { submissionSchema } from '../validators/schemas';

const router = Router();

router.post('/', authMiddleware, validateBody(submissionSchema), createSubmission);

export default router;
