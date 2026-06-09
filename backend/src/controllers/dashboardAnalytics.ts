import { Request, Response } from 'express';
import prisma from '../prisma/client';
import {
  countUniqueSubmissions,
  fetchFilteredSubmissions,
  parseFilterQuery,
} from '../utils/submissionFilters';
import {
  contributionDistribution,
  countActiveRegions,
  countActiveUsers,
  filterRowsBySelections,
  leaderboardFromRows,
  parseArrayParam,
  prepareAnalyticsRows,
  resolveDashboardRange,
  rowsInRange,
  uniqueByRegion,
  uniqueByUser,
} from '../utils/dashboardAnalytics';

function parseUnifiedQuery(query: Record<string, unknown>) {
  const period = String(query.period || 'week');
  const fromDate = String(query.fromDate || '').trim();
  const toDate = String(query.toDate || '').trim();
  const regions = parseArrayParam(query.regions ?? query.region);
  const users = parseArrayParam(query.users ?? query.user);
  return { period, fromDate, toDate, regions, users };
}

async function loadAllAnalyticsRows() {
  return prepareAnalyticsRows(await fetchFilteredSubmissions(prisma, parseFilterQuery({})));
}

async function buildFilterOptions(allRows: ReturnType<typeof prepareAnalyticsRows>, regions: string[]) {
  const regionSet = new Set<string>();
  allRows.forEach((row) => {
    if (row.user?.region) regionSet.add(row.user.region);
  });

  const userWhere: Record<string, unknown> = { role: 'user' };
  if (regions.length) userWhere.region = { in: regions };

  const dbUsers = await prisma.user.findMany({
    where: userWhere,
    select: { username: true, region: true },
    orderBy: { username: 'asc' },
  });

  dbUsers.forEach((user) => {
    if (user.region) regionSet.add(user.region);
  });

  return {
    regions: [...regionSet].sort(),
    users: dbUsers.map((user) => ({ username: user.username, region: user.region })),
  };
}

async function buildInactiveUsers(
  allRows: ReturnType<typeof prepareAnalyticsRows>,
  rangeRows: ReturnType<typeof prepareAnalyticsRows>,
  regions: string[],
  users: string[],
) {
  const userWhere: Record<string, unknown> = { role: 'user' };
  if (regions.length) userWhere.region = { in: regions };
  if (users.length) userWhere.username = { in: users };

  const scopedUsers = await prisma.user.findMany({
    where: userWhere,
    select: { username: true, region: true },
  });

  const activeUsernames = new Set(
    rangeRows.map((row) => row.user?.username).filter(Boolean) as string[],
  );

  const lifetimeByUser = uniqueByUser(filterRowsBySelections(allRows, regions, users));

  const inactiveList = scopedUsers
    .filter((user) => !activeUsernames.has(user.username))
    .map((user) => {
      const lifetime = lifetimeByUser.get(user.username);
      return {
        username: user.username,
        region: user.region,
        lastSubmission: lifetime?.lastAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => {
      if (!a.lastSubmission && !b.lastSubmission) return a.username.localeCompare(b.username);
      if (!a.lastSubmission) return -1;
      if (!b.lastSubmission) return 1;
      return new Date(a.lastSubmission).getTime() - new Date(b.lastSubmission).getTime();
    });

  return {
    count: inactiveList.length,
    list: inactiveList,
  };
}

export async function getUnifiedDashboard(req: Request, res: Response) {
  const { period, fromDate, toDate, regions, users } = parseUnifiedQuery(req.query);
  try {
    const allRows = await loadAllAnalyticsRows();
    const filteredRows = filterRowsBySelections(allRows, regions, users);
    const range = resolveDashboardRange(period, fromDate, toDate);
    const rangeRows = rowsInRange(filteredRows, range);
    const filterOptions = await buildFilterOptions(allRows, regions);
    const inactiveUsers = await buildInactiveUsers(allRows, rangeRows, regions, users);

    const byRegion = uniqueByRegion(rangeRows);
    const byUser = uniqueByUser(rangeRows);

    const regionTotalChart = Array.from(byRegion.submissions.entries())
      .map(([region, keys]) => ({ region, uniqueCount: keys.size }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount);

    const regionContribution = contributionDistribution(
      regionTotalChart.map((item) => ({ name: item.region, uniqueCount: item.uniqueCount })),
    ).map((item) => ({
      region: item.name,
      uniqueCount: item.uniqueCount,
      percentage: Math.round(item.percentage),
    }));

    const userTopChart = Array.from(byUser.entries())
      .map(([username, data]) => ({ username, uniqueCount: data.keys.size }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount);

    const userActivityDistribution = contributionDistribution(
      userTopChart.map((item) => ({ name: item.username, uniqueCount: item.uniqueCount })),
    ).map((item) => ({
      username: item.name,
      uniqueCount: item.uniqueCount,
      percentage: Math.round(item.percentage),
    }));

    const regionLeaderboard = leaderboardFromRows(rangeRows, 'region').map((item) => ({
      rank: item.rank,
      region: item.name,
      totalSubmissions: item.totalSubmissions,
    }));

    const userLeaderboard = leaderboardFromRows(rangeRows, 'user').map((item) => ({
      rank: item.rank,
      username: item.name,
      totalSubmissions: item.totalSubmissions,
    }));

    return res.status(200).json({
      success: true,
      data: {
        lastUpdated: new Date().toISOString(),
        filters: { period, fromDate, toDate, regions, users },
        filterOptions,
        summary: {
          totalSubmissions: countUniqueSubmissions(rangeRows),
          activeUsers: countActiveUsers(rangeRows),
          activeRegions: countActiveRegions(rangeRows),
          inactiveUsers: inactiveUsers.count,
        },
        inactiveUsers: inactiveUsers.list,
        regions: {
          totalChart: regionTotalChart,
          contribution: regionContribution,
        },
        users: {
          topChart: userTopChart,
          activityDistribution: userActivityDistribution,
        },
        topPerformers: {
          regions: regionLeaderboard,
          users: userLeaderboard,
        },
      },
    });
  } catch (error) {
    console.error('getUnifiedDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Legacy endpoints kept for backward compatibility
export async function getTodayDashboard(req: Request, res: Response) {
  req.query = { ...req.query, period: 'today' };
  return getUnifiedDashboard(req, res);
}

export async function getRegionDashboard(req: Request, res: Response) {
  return getUnifiedDashboard(req, res);
}

export async function getUserDashboard(req: Request, res: Response) {
  return getUnifiedDashboard(req, res);
}

export async function getLeaderboardDashboard(req: Request, res: Response) {
  const period = String(req.query.period || 'today');
  req.query = { ...req.query, period };
  return getUnifiedDashboard(req, res);
}
