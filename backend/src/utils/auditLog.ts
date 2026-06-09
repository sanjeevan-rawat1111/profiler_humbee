import prisma from '../prisma/client';

export async function recordAuditLog(params: {
  userId?: string | null;
  username: string;
  region?: string | null;
  eventType: 'LOGIN' | 'LOGOUT';
  status: 'SUCCESS' | 'FAIL';
  reason?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        username: params.username,
        region: params.region ?? null,
        eventType: params.eventType,
        status: params.status,
        reason: params.reason ?? null,
      },
    });
  } catch (error) {
    console.error('recordAuditLog error:', error);
  }
}
