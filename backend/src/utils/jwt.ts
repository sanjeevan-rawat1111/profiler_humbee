import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'humbee-super-secret-jwt-key-24h-validity';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
