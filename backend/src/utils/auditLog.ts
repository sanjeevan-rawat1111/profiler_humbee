import prisma from '../prisma/client';
import { isExcludedAnalyticsMobile } from '../config/excludedAnalyticsUsers';

export async function recordAuditLog(params: {
  userId?: string | null;
  username: string;
  name?: string | null;
  region?: string | null;
  state?: string | null;
  district?: string | null;
  eventType: 'LOGIN' | 'LOGOUT';
  status: 'SUCCESS' | 'FAIL';
  reason?: string | null;
}) {
  if (isExcludedAnalyticsMobile(params.username)) return;

  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        username: params.username,
        name: params.name ?? null,
        region: params.region ?? params.state ?? null,
        state: params.state ?? params.region ?? null,
        district: params.district ?? null,
        eventType: params.eventType,
        status: params.status,
        reason: params.reason ?? null,
      },
    });
  } catch (error) {
    console.error('recordAuditLog error:', error);
  }
}
