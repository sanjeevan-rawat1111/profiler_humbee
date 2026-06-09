import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { verifyToken } from '../utils/jwt';

const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN || process.env.ADMIN_API_KEY || 'humbee-admin-secret-key-123-token';

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Strategy 1: x-admin-token header (for internal service-to-service calls)
  const adminTokenHeader = req.headers['x-admin-token'];
  if (adminTokenHeader && adminTokenHeader === ADMIN_SECRET_TOKEN) {
    return next();
  }

  // Strategy 2: JWT with admin role
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.role === 'admin') {
      req.user = decoded;
      return next();
    }
  }

  return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
}
