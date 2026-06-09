import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../utils/auditLog';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      await recordAuditLog({
        username,
        eventType: 'LOGIN',
        status: 'FAIL',
        reason: 'Invalid username or password',
      });
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await recordAuditLog({
        userId: user.id,
        username,
        region: user.region,
        eventType: 'LOGIN',
        status: 'FAIL',
        reason: 'Invalid username or password',
      });
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = generateToken({ userId: user.id, username: user.username, role: user.role });

    await recordAuditLog({
      userId: user.id,
      username: user.username,
      region: user.region,
      eventType: 'LOGIN',
      status: 'SUCCESS',
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, status: user.status, createdAt: user.createdAt },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { region: true } });
      await recordAuditLog({
        userId: req.user.userId,
        username: req.user.username,
        region: user?.region ?? null,
        eventType: 'LOGOUT',
        status: 'SUCCESS',
      });
    }
    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function validate(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: { id: user.id, username: user.username, role: user.role, status: user.status, createdAt: user.createdAt },
      },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
