import { isExcludedAnalyticsMobile } from '../config/excludedAnalyticsUsers';
import { normalizePeriod, resolvePeriodRange } from './datePeriod';

export type SubmissionRow = {
  id: string;
  sapCode: string;
  mobileNumber: string;
  submittedAt: Date;
  userId: string;
  user: { name: string; mobileNumber: string; role: string; region: string } | null;
};

export function isAnalyticsUser(row: SubmissionRow) {
  if (!row.user || row.user.role !== 'user') return false;
  return !isExcludedAnalyticsMobile(row.user.mobileNumber);
}

export function filterAnalyticsRows(rows: SubmissionRow[]) {
  return rows.filter(isAnalyticsUser);
}

export function uniqueSubmissionKey(row: Pick<SubmissionRow, 'sapCode' | 'mobileNumber'>) {
  return `${row.sapCode.trim().toLowerCase()}::${row.mobileNumber.trim()}`;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toHourKey(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

export function parseFilterQuery(query: Record<string, unknown>) {
  const search = String(query.search || '').trim();
  const user = String(query.user || '').trim();
  const region = String(query.region || '').trim();
  const sapCode = String(query.sapCode || '').trim();
  const mobileNumber = String(query.mobileNumber || query.mobile || '').trim();
  const singleDay = query.singleDay === 'true' || query.singleDay === true;
  const date = String(query.date || '').trim();
  const fromDate = String(query.fromDate || query.customStart || '').trim();
  const toDate = String(query.toDate || query.customEnd || '').trim();
  const period = normalizePeriod(String(query.period || 'week'));
  const rankingSort = String(query.rankingSort || 'desc') === 'asc' ? 'asc' : 'desc';

  return { search, user, region, sapCode, mobileNumber, singleDay, date, fromDate, toDate, period, rankingSort };
}

export function buildDateRange(filters: ReturnType<typeof parseFilterQuery>) {
  if (filters.period) {
    return resolvePeriodRange(filters.period, filters.fromDate, filters.toDate);
  }

  if (filters.singleDay && filters.date) {
    const d = new Date(filters.date);
    if (isNaN(d.getTime())) return undefined;
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (filters.fromDate || filters.toDate) {
    const start = filters.fromDate ? new Date(filters.fromDate) : null;
    const end = filters.toDate ? new Date(filters.toDate) : null;
    if (!start && !end) return undefined;
    const rangeStart = start && !isNaN(start.getTime()) ? start : new Date(0);
    const rangeEnd = end && !isNaN(end.getTime()) ? end : new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);
    return { gte: rangeStart, lte: rangeEnd };
  }

  return resolvePeriodRange('week');
}

export function getKpiPeriodRange(period: string, fromDate?: string, toDate?: string) {
  return resolvePeriodRange(normalizePeriod(period), fromDate, toDate);
}

export function buildSubmissionWhere(filters: ReturnType<typeof parseFilterQuery>) {
  const where: Record<string, unknown> = {};
  if (filters.sapCode) where.sapCode = { contains: filters.sapCode };
  if (filters.mobileNumber) where.mobileNumber = { contains: filters.mobileNumber };
  if (filters.user || filters.region) {
    const userFilter: Record<string, unknown> = {};
    if (filters.user) {
      userFilter.OR = [
        { mobileNumber: { contains: filters.user } },
        { name: { contains: filters.user, mode: 'insensitive' } },
      ];
    }
    if (filters.region) userFilter.region = { contains: filters.region };
    where.user = userFilter;
  }

  const submittedAt = buildDateRange(filters);
  if (submittedAt) where.submittedAt = submittedAt;

  if (filters.search) {
    where.OR = [
      { sapCode: { contains: filters.search } },
      { mobileNumber: { contains: filters.search } },
      { user: { mobileNumber: { contains: filters.search } } },
      { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      { user: { region: { contains: filters.search } } },
    ];
  }

  return where;
}

export async function fetchFilteredSubmissions(prisma: any, filters: ReturnType<typeof parseFilterQuery>) {
  const where = buildSubmissionWhere(filters);
  return prisma.submission.findMany({
    where,
    select: {
      id: true,
      sapCode: true,
      mobileNumber: true,
      submittedAt: true,
      userId: true,
      user: { select: { name: true, mobileNumber: true, role: true, region: true } },
    },
    orderBy: { submittedAt: 'desc' },
  }) as Promise<SubmissionRow[]>;
}

export function countUniqueSubmissions(rows: Pick<SubmissionRow, 'sapCode' | 'mobileNumber'>[]) {
  return new Set(rows.map(uniqueSubmissionKey)).size;
}

export function daysInRange(range?: { gte: Date; lte: Date }) {
  if (!range) return 1;
  const diff = range.lte.getTime() - range.gte.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
