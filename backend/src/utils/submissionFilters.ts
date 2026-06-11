import { excludedAnalyticsMobileNumbers, isExcludedAnalyticsMobile } from '../config/excludedAnalyticsUsers';
import { parseArrayParam } from './dashboardAnalytics';
import { normalizePeriod, resolvePeriodRange } from './datePeriod';

export type SubmissionRow = {
  id: string;
  sapCode: string;
  mobileNumber: string;
  submittedAt: Date;
  userId: string;
  user: {
    name: string;
    mobileNumber: string;
    role: string;
    region: string;
    stateId: string | null;
    districtId: string | null;
    state: string;
    district: string;
  } | null;
};

export function baseSalespersonUserFilter(): Record<string, unknown> {
  return {
    role: 'user',
    mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
  };
}

export function isSalespersonRole(role: string | undefined | null) {
  return role === 'user';
}

export function isAnalyticsUser(row: SubmissionRow) {
  if (!row.user || !isSalespersonRole(row.user.role)) return false;
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
  const names = parseArrayParam(query.names ?? query.name);
  const userMobiles = parseArrayParam(query.userMobiles ?? query.users ?? query.user);
  const regionId = String(query.regionId || '').trim();
  const stateId = String(query.stateId || '').trim();
  const districtId = String(query.districtId || '').trim();
  const sapCode = String(query.sapCode || '').trim();
  const mobileNumber = String(query.mobileNumber || query.mobile || '').trim();
  const singleDay = query.singleDay === 'true' || query.singleDay === true;
  const date = String(query.date || '').trim();
  const fromDate = String(query.fromDate || query.customStart || '').trim();
  const toDate = String(query.toDate || query.customEnd || '').trim();
  const period = normalizePeriod(String(query.period || 'week'));
  const rankingSort = String(query.rankingSort || 'desc') === 'asc' ? 'asc' : 'desc';

  return {
    search, names, userMobiles, regionId, stateId, districtId, sapCode, mobileNumber,
    singleDay, date, fromDate, toDate, period, rankingSort,
  };
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

function salespersonScopedUserFilter(
  filters: ReturnType<typeof parseFilterQuery>,
  regionStateIds?: string[],
) {
  const userFilter: Record<string, unknown> = { ...baseSalespersonUserFilter() };

  if (filters.names.length) {
    userFilter.name = { in: filters.names };
  }
  if (filters.userMobiles.length) {
    userFilter.mobileNumber = { in: filters.userMobiles };
  }
  if (filters.districtId) {
    userFilter.districtId = filters.districtId;
  } else if (filters.stateId) {
    userFilter.stateId = filters.stateId;
  } else if (regionStateIds?.length) {
    userFilter.stateId = { in: regionStateIds };
  }

  return userFilter;
}

export function buildSubmissionWhere(
  filters: ReturnType<typeof parseFilterQuery>,
  options?: { regionStateIds?: string[]; skipDate?: boolean },
) {
  const andClauses: Record<string, unknown>[] = [
    { user: salespersonScopedUserFilter(filters, options?.regionStateIds) },
  ];

  if (filters.sapCode) andClauses.push({ sapCode: { contains: filters.sapCode } });
  if (filters.mobileNumber) andClauses.push({ mobileNumber: { contains: filters.mobileNumber } });

  if (!options?.skipDate) {
    const submittedAt = buildDateRange(filters);
    if (submittedAt) andClauses.push({ submittedAt });
  }

  if (filters.search) {
    const salesperson = baseSalespersonUserFilter();
    andClauses.push({
      OR: [
        { sapCode: { contains: filters.search } },
        { mobileNumber: { contains: filters.search } },
        { user: { AND: [salesperson, { mobileNumber: { contains: filters.search } }] } },
        { user: { AND: [salesperson, { name: { contains: filters.search, mode: 'insensitive' } }] } },
        { user: { AND: [salesperson, { state: { contains: filters.search, mode: 'insensitive' } }] } },
        { user: { AND: [salesperson, { district: { contains: filters.search, mode: 'insensitive' } }] } },
      ],
    });
  }

  return andClauses.length === 1 ? { user: andClauses[0].user } : { AND: andClauses };
}

export async function fetchFilteredSubmissions(
  prisma: any,
  filters: ReturnType<typeof parseFilterQuery>,
  options?: { regionStateIds?: string[]; scopeDistrictIds?: string[]; skipDate?: boolean },
) {
  const where = buildSubmissionWhere(filters, {
    regionStateIds: options?.regionStateIds,
    skipDate: options?.skipDate,
  });
  if (options?.scopeDistrictIds?.length) {
    const applyDistrictScope = (userWhere: Record<string, unknown>) => {
      if (userWhere.districtId) {
        const requested = String(userWhere.districtId);
        userWhere.districtId = options.scopeDistrictIds!.includes(requested)
          ? requested
          : { in: ['__none__'] };
      } else {
        userWhere.districtId = { in: options.scopeDistrictIds };
      }
    };

    if (where.user) {
      applyDistrictScope(where.user as Record<string, unknown>);
    } else if (Array.isArray(where.AND)) {
      const andClauses = where.AND as Record<string, unknown>[];
      const userClause = andClauses.find((clause) => clause.user);
      if (userClause?.user) applyDistrictScope(userClause.user as Record<string, unknown>);
    }
  }
  return prisma.submission.findMany({
    where,
    select: {
      id: true,
      sapCode: true,
      mobileNumber: true,
      submittedAt: true,
      userId: true,
      user: {
        select: {
          name: true,
          mobileNumber: true,
          role: true,
          region: true,
          stateId: true,
          districtId: true,
          state: true,
          district: true,
        },
      },
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
