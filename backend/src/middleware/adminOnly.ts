import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function adminOnlyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Administrator access required' });
  }
  return next();
}
