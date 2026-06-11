import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { excludedAnalyticsMobileNumbers } from '../config/excludedAnalyticsUsers';
import { sendCsv, sendExcel } from '../utils/exportHelpers';
import {
  countUniqueSubmissions,
  daysInRange,
  fetchFilteredSubmissions,
  filterAnalyticsRows,
  getKpiPeriodRange,
  isAnalyticsUser,
  parseFilterQuery,
  SubmissionRow,
  toDateKey,
  toHourKey,
  uniqueSubmissionKey,
} from '../utils/submissionFilters';

function uniqueByUser(rows: SubmissionRow[]) {
  const map = new Map<string, { name: string; keys: Set<string> }>();
  rows.forEach((row) => {
    if (!isAnalyticsUser(row)) return;
    const key = row.user!.mobileNumber;
    if (!map.has(key)) map.set(key, { name: row.user!.name, keys: new Set() });
    map.get(key)?.keys.add(uniqueSubmissionKey(row));
  });
  return map;
}

function fillDateRangeTrend(rows: SubmissionRow[], range: { gte: Date; lte: Date }) {
  const trendByDay = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const day = toDateKey(row.submittedAt);
    if (!trendByDay.has(day)) trendByDay.set(day, new Set());
    trendByDay.get(day)?.add(uniqueSubmissionKey(row));
  });

  const cursor = new Date(range.gte);
  while (cursor <= range.lte) {
    const day = toDateKey(cursor);
    if (!trendByDay.has(day)) trendByDay.set(day, new Set());
    cursor.setDate(cursor.getDate() + 1);
  }

  return Array.from(trendByDay.entries())
    .map(([date, set]) => ({ date, uniqueCount: set.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getKpiDashboard(req: Request, res: Response) {
  const filters = parseFilterQuery(req.query);
  const periodRange = getKpiPeriodRange(filters.period, filters.fromDate, filters.toDate);

  try {
    const allRows = filterAnalyticsRows(await fetchFilteredSubmissions(prisma, filters));
    const periodRows = periodRange
      ? allRows.filter((row) => row.submittedAt >= periodRange.gte && row.submittedAt <= periodRange.lte)
      : allRows;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayRows = allRows.filter((row) => row.submittedAt >= todayStart && row.submittedAt <= todayEnd);

    const userUniqueMap = uniqueByUser(periodRows);
    const userPerformance = Array.from(userUniqueMap.entries())
      .map(([mobileNumber, data]) => ({ name: data.name, mobileNumber, uniqueCount: data.keys.size }))
      .sort((a, b) => {
        const diff = a.uniqueCount - b.uniqueCount;
        return filters.rankingSort === 'asc' ? diff || a.mobileNumber.localeCompare(b.mobileNumber) : -diff || a.mobileNumber.localeCompare(b.mobileNumber);
      });

    const topPerformer = userPerformance[0] ?? null;
    const totalUnique = countUniqueSubmissions(periodRows);
    const activeUsers = userPerformance.filter((u) => u.uniqueCount > 0).length;
    const periodDays = daysInRange(periodRange);
    const lastActivity = allRows[0]?.submittedAt?.toISOString() ?? null;

    const totalUniqueAll = countUniqueSubmissions(periodRows);
    const contribution = userPerformance.map((item) => ({
      name: item.name,
      mobileNumber: item.mobileNumber,
      uniqueCount: item.uniqueCount,
      percentage: totalUniqueAll > 0 ? Math.round((item.uniqueCount / totalUniqueAll) * 1000) / 10 : 0,
    }));

    const trend = periodRange ? fillDateRangeTrend(periodRows, periodRange) : [];

    const hourlyMap = new Map<string, Set<string>>();
    periodRows.forEach((row) => {
      const hour = toHourKey(row.submittedAt);
      if (!hourlyMap.has(hour)) hourlyMap.set(hour, new Set());
      hourlyMap.get(hour)?.add(uniqueSubmissionKey(row));
    });
    const hourlyActivity = Array.from(hourlyMap.entries())
      .map(([hour, set]) => ({ hour, uniqueCount: set.size }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const userFirstLast = new Map<string, { first: Date; last: Date }>();
    periodRows.forEach((row) => {
      if (!row.user) return;
      const name = row.user.mobileNumber;
      const existing = userFirstLast.get(name);
      if (!existing) {
        userFirstLast.set(name, { first: row.submittedAt, last: row.submittedAt });
      } else {
        if (row.submittedAt < existing.first) existing.first = row.submittedAt;
        if (row.submittedAt > existing.last) existing.last = row.submittedAt;
      }
    });

    const topPerformingUsers = userPerformance.map((item, index) => {
      const bounds = userFirstLast.get(item.mobileNumber);
      return {
        rank: index + 1,
        name: item.name,
        mobileNumber: item.mobileNumber,
        uniqueSubmissions: item.uniqueCount,
        firstSubmission: bounds?.first.toISOString() ?? null,
        lastSubmission: bounds?.last.toISOString() ?? null,
      };
    });

    const recentActivity = allRows.slice(0, 20).map((row) => ({
      timestamp: row.submittedAt.toISOString(),
      userName: row.user?.name ?? 'System',
      userMobileNumber: row.user?.mobileNumber ?? '',
      region: row.user?.region ?? '',
      sapCode: row.sapCode,
      customerMobileNumber: row.mobileNumber,
    }));

    const allUsers = await prisma.user.findMany({
      where: {
        role: 'user',
        mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
      },
      select: { name: true, mobileNumber: true, region: true },
      orderBy: { mobileNumber: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: {
        lastUpdated: new Date().toISOString(),
        summary: {
          topPerformer,
          todaysSubmissions: countUniqueSubmissions(todayRows),
          totalSubmissions: totalUnique,
          activeUsers,
          avgSubmissionsPerDay: Math.round((totalUnique / periodDays) * 100) / 100,
          lastActivity,
        },
        userPerformance,
        trend,
        contribution,
        hourlyActivity,
        topPerformingUsers,
        recentActivity,
        users: allUsers.map((u) => u.mobileNumber),
        regions: [...new Set(allUsers.map((u) => u.region))].sort(),
      },
    });
  } catch (error) {
    console.error('getKpiDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportKpiCsv(req: Request, res: Response) {
  try {
    const filters = parseFilterQuery(req.query);
    const allRows = filterAnalyticsRows(await fetchFilteredSubmissions(prisma, filters));
    const userMap = uniqueByUser(allRows);
    const rows = Array.from(userMap.entries())
      .map(([mobileNumber, data]) => [data.name, mobileNumber, data.keys.size])
      .sort((a, b) => Number(b[2]) - Number(a[2]));

    return sendCsv(res, 'kpi-dashboard.csv', ['Name', 'User Mobile', 'Unique Submissions'], rows);
  } catch (error) {
    console.error('exportKpiCsv error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportKpiExcel(req: Request, res: Response) {
  try {
    const filters = parseFilterQuery(req.query);
    const allRows = filterAnalyticsRows(await fetchFilteredSubmissions(prisma, filters));
    const userMap = uniqueByUser(allRows);
    const rows = Array.from(userMap.entries())
      .map(([mobileNumber, data]) => [data.name, mobileNumber, data.keys.size])
      .sort((a, b) => Number(b[2]) - Number(a[2]));

    return sendExcel(res, 'kpi-dashboard.xls', ['Name', 'User Mobile', 'Unique Submissions'], rows);
  } catch (error) {
    console.error('exportKpiExcel error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
