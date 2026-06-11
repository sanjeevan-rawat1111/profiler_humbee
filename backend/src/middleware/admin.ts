import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { verifyToken } from '../utils/jwt';
import { resolveGeographyScope } from '../utils/geographyScope';

const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN || process.env.ADMIN_API_KEY || 'humbee-admin-secret-key-123-token';

export async function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminTokenHeader = req.headers['x-admin-token'];
  if (adminTokenHeader && adminTokenHeader === ADMIN_SECRET_TOKEN) {
    req.geographyScope = { unrestricted: true, districtIds: [], stateIds: [], regionIds: [] };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded && (decoded.role === 'admin' || decoded.role === 'manager')) {
      req.user = decoded;
      try {
        req.geographyScope = await resolveGeographyScope(decoded.userId, decoded.role);
      } catch (error) {
        console.error('adminMiddleware scope error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      return next();
    }
  }

  return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
}
