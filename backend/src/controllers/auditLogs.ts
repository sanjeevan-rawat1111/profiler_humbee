import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendCsv, sendExcel } from '../utils/exportHelpers';

function buildAuditWhere(query: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  const user = String(query.user || '').trim();
  const region = String(query.region || '').trim();
  const eventType = String(query.eventType || '').trim();
  const status = String(query.status || '').trim();
  const fromDate = String(query.fromDate || '').trim();
  const toDate = String(query.toDate || '').trim();

  if (user) where.username = { contains: user };
  if (region) where.region = { contains: region };
  if (eventType) where.eventType = eventType;
  if (status) where.status = status;

  if (fromDate || toDate) {
    const range: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      const start = new Date(fromDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        range.gte = start;
      }
    }
    if (toDate) {
      const end = new Date(toDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
    }
    if (range.gte || range.lte) where.createdAt = range;
  }

  return where;
}

export async function getAuditLogs(req: Request, res: Response) {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const skip = (page - 1) * limit;

  try {
    const where = buildAuditWhere(req.query);
    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          user: log.username,
          region: log.region ?? '',
          timestamp: log.createdAt.toISOString(),
          eventType: log.eventType,
          status: log.status,
          reason: log.reason,
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function fetchAllAuditLogs(query: Record<string, unknown>) {
  const where = buildAuditWhere(query);
  return prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function exportAuditLogsCsv(req: Request, res: Response) {
  try {
    const logs = await fetchAllAuditLogs(req.query);
    return sendCsv(
      res,
      'audit-logs.csv',
      ['Mobile Number', 'Region', 'Timestamp', 'Event Type', 'Status', 'Reason'],
      logs.map((log) => [log.username, log.region ?? '', log.createdAt.toISOString(), log.eventType, log.status, log.reason ?? ''])
    );
  } catch (error) {
    console.error('exportAuditLogsCsv error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportAuditLogsExcel(req: Request, res: Response) {
  try {
    const logs = await fetchAllAuditLogs(req.query);
    return sendExcel(
      res,
      'audit-logs.xls',
      ['Mobile Number', 'Region', 'Timestamp', 'Event Type', 'Status', 'Reason'],
      logs.map((log) => [log.username, log.region ?? '', log.createdAt.toISOString(), log.eventType, log.status, log.reason ?? ''])
    );
  } catch (error) {
    console.error('exportAuditLogsExcel error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
