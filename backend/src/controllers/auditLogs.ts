import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { excludedAnalyticsMobileNumbers } from '../config/excludedAnalyticsUsers';
import { sendCsv, sendExcel } from '../utils/exportHelpers';
import { parseArrayParam } from '../utils/dashboardAnalytics';
import { parsePeriodQuery, periodToDateRange } from '../utils/datePeriod';
import { GeographyScope, resolveRegionStateIds } from '../utils/geographyScope';
import {
  filterDistricts,
  getDistrictById,
  getStateById,
} from '../data/staticGeography';

type AuditEventRow = {
  id: string;
  username: string;
  name: string | null;
  state: string | null;
  district: string | null;
  eventType: string;
  status: string;
  reason: string | null;
  createdAt: Date;
};

function formatStatus(status: string) {
  return status === 'SUCCESS' ? 'Success' : 'Failed';
}

async function buildAuditWhere(query: Record<string, unknown>, scope?: GeographyScope) {
  const names = parseArrayParam(query.names ?? query.name);
  const userMobiles = parseArrayParam(query.userMobiles ?? query.users ?? query.user);
  const search = String(query.search || '').trim();
  const regionId = String(query.regionId || '').trim();
  const stateId = String(query.stateId || '').trim();
  const districtId = String(query.districtId || '').trim();
  const eventType = String(query.eventType || '').trim();

  const andClauses: Record<string, unknown>[] = [
    { username: { notIn: excludedAnalyticsMobileNumbers() } },
  ];

  if (search) {
    andClauses.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search } },
        { state: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
        { eventType: { contains: search, mode: 'insensitive' } },
      ],
    });
  } else {
    if (names.length) andClauses.push({ name: { in: names } });
    if (userMobiles.length) andClauses.push({ username: { in: userMobiles } });
  }

  if (regionId) {
    const regionStateIds = await resolveRegionStateIds(regionId);
    const regionStateNames = regionStateIds
      .map((id) => getStateById(id)?.stateName)
      .filter(Boolean) as string[];
    if (regionStateNames.length) {
      andClauses.push({ state: { in: regionStateNames } });
    } else {
      andClauses.push({ state: '__none__' });
    }
  } else if (stateId) {
    const state = getStateById(stateId);
    if (state) andClauses.push({ state: state.stateName });
  }
  if (districtId) {
    const district = getDistrictById(districtId);
    if (district) {
      if (!stateId || district.stateId === stateId) {
        andClauses.push({ district: district.districtName });
      }
    }
  }
  if (eventType) andClauses.push({ eventType });

  if (scope && !scope.unrestricted) {
    if (!scope.districtIds.length) {
      andClauses.push({ district: '__none__' });
    } else {
      const scopedDistrictNames = filterDistricts({ ids: scope.districtIds })
        .map((district) => district.districtName);
      andClauses.push({ district: { in: scopedDistrictNames.length ? scopedDistrictNames : ['__none__'] } });
    }
  }

  const range = periodToDateRange(query);
  andClauses.push({ createdAt: range });

  const where: Record<string, unknown> = andClauses.length === 1
    ? andClauses[0]
    : { AND: andClauses };

  return where;
}

function aggregateSummary(events: AuditEventRow[]) {
  const byMobile = new Map<string, {
    name: string;
    userMobile: string;
    state: string;
    district: string;
    events: AuditEventRow[];
  }>();

  events.forEach((event) => {
    if (!byMobile.has(event.username)) {
      byMobile.set(event.username, {
        name: event.name ?? '',
        userMobile: event.username,
        state: event.state ?? '',
        district: event.district ?? '',
        events: [],
      });
    }
    const entry = byMobile.get(event.username)!;
    if (event.name) entry.name = event.name;
    if (event.state) entry.state = event.state;
    if (event.district) entry.district = event.district;
    entry.events.push(event);
  });

  return Array.from(byMobile.values())
    .map((entry) => {
      const successfulLogins = entry.events.filter(
        (event) => event.status === 'SUCCESS' && event.eventType === 'LOGIN',
      );
      const successfulActivity = entry.events.filter(
        (event) => event.status === 'SUCCESS' && (event.eventType === 'LOGIN' || event.eventType === 'LOGOUT'),
      );

      const firstActivity = successfulLogins.length
        ? new Date(Math.min(...successfulLogins.map((event) => event.createdAt.getTime())))
        : null;
      const lastActivity = successfulActivity.length
        ? new Date(Math.max(...successfulActivity.map((event) => event.createdAt.getTime())))
        : null;

      return {
        userMobile: entry.userMobile,
        name: entry.name,
        state: entry.state,
        district: entry.district,
        firstActivity: firstActivity?.toISOString() ?? null,
        lastActivity: lastActivity?.toISOString() ?? null,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return bTime - aTime;
    });
}

async function fetchAuditEvents(query: Record<string, unknown>, scope?: GeographyScope) {
  const where = await buildAuditWhere(query, scope);
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      username: true,
      name: true,
      state: true,
      district: true,
      eventType: true,
      status: true,
      reason: true,
      createdAt: true,
    },
  });
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

  try {
    const events = await fetchAuditEvents(req.query, req.geographyScope);
    const summary = aggregateSummary(events);
    const total = summary.length;
    const start = (page - 1) * limit;
    const records = summary.slice(start, start + limit);

    return res.status(200).json({
      success: true,
      data: {
        records,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getAuditLogDetails(req: AuthenticatedRequest, res: Response) {
  const userMobile = String(req.params.userMobile || '').trim();
  if (!userMobile) {
    return res.status(400).json({ success: false, message: 'User mobile is required' });
  }

  try {
    const events = await fetchAuditEvents({ ...req.query, user: userMobile }, req.geographyScope);
    const userEvents = events
      .filter((event) => event.username === userMobile)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const profile = userEvents[0];

    return res.status(200).json({
      success: true,
      data: {
        name: profile?.name ?? '',
        userMobile,
        state: profile?.state ?? '',
        district: profile?.district ?? '',
        activities: userEvents.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          timestamp: event.createdAt.toISOString(),
          status: formatStatus(event.status),
          reason: event.reason ?? '',
        })),
      },
    });
  } catch (error) {
    console.error('getAuditLogDetails error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

function buildExportRows(query: Record<string, unknown>, scope?: GeographyScope) {
  return fetchAuditEvents(query, scope).then(aggregateSummary);
}

export async function exportAuditLogsCsv(req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await buildExportRows(req.query, req.geographyScope);
    return sendCsv(
      res,
      'audit-activity-summary.csv',
      ['Name', 'User Mobile', 'State', 'District', 'First Activity', 'Last Activity'],
      rows.map((row) => [
        row.name,
        row.userMobile,
        row.state,
        row.district || '—',
        row.firstActivity ?? '',
        row.lastActivity ?? '',
      ]),
    );
  } catch (error) {
    console.error('exportAuditLogsCsv error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportAuditLogsExcel(req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await buildExportRows(req.query, req.geographyScope);
    return sendExcel(
      res,
      'audit-activity-summary.xls',
      ['Name', 'User Mobile', 'State', 'District', 'First Activity', 'Last Activity'],
      rows.map((row) => [
        row.name,
        row.userMobile,
        row.state,
        row.district || '—',
        row.firstActivity ?? '',
        row.lastActivity ?? '',
      ]),
    );
  } catch (error) {
    console.error('exportAuditLogsExcel error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export { parsePeriodQuery };
