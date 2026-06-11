import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { excludedAnalyticsMobileNumbers, isExcludedAnalyticsMobile } from '../config/excludedAnalyticsUsers';
import {
  countUniqueSubmissions,
  fetchFilteredSubmissions,
  parseFilterQuery,
} from '../utils/submissionFilters';
import {
  contributionDistribution,
  countActiveStates,
  countActiveUsers,
  filterRowsBySelections,
  leaderboardFromRows,
  parseArrayParam,
  prepareAnalyticsRows,
  resolveDashboardRange,
  rowsInRange,
  uniqueByState,
  uniqueByUser,
} from '../utils/dashboardAnalytics';

function parseUnifiedQuery(query: Record<string, unknown>) {
  const period = String(query.period || 'week');
  const fromDate = String(query.fromDate || '').trim();
  const toDate = String(query.toDate || '').trim();
  const stateId = String(query.stateId || '').trim();
  const districtId = String(query.districtId || '').trim();
  const users = parseArrayParam(query.users ?? query.user);
  return { period, fromDate, toDate, stateId, districtId, users };
}

async function loadAllAnalyticsRows() {
  return prepareAnalyticsRows(await fetchFilteredSubmissions(prisma, parseFilterQuery({})));
}

async function buildFilterOptions(stateId: string) {
  const [states, districts, dbUsers] = await Promise.all([
    prisma.state.findMany({
      select: { id: true, stateName: true, stateCode: true },
      orderBy: { stateName: 'asc' },
    }),
    stateId
      ? prisma.district.findMany({
        where: { stateId },
        select: { id: true, districtName: true, districtCode: true, stateId: true },
        orderBy: { districtName: 'asc' },
      })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        role: 'user',
        mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
        ...(stateId ? { stateId } : {}),
      },
      select: { name: true, mobileNumber: true, stateId: true, districtId: true, state: true, district: true },
      orderBy: { mobileNumber: 'asc' },
    }),
  ]);

  return {
    states,
    districts,
    users: dbUsers.map((user) => ({
      name: user.name,
      mobileNumber: user.mobileNumber,
      stateId: user.stateId,
      districtId: user.districtId,
      state: user.state,
      district: user.district,
    })),
  };
}

async function buildInactiveUsers(
  allRows: ReturnType<typeof prepareAnalyticsRows>,
  rangeRows: ReturnType<typeof prepareAnalyticsRows>,
  stateId: string,
  districtId: string,
  users: string[],
) {
  const userWhere: Record<string, unknown> = {
    role: 'user',
    mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
  };
  if (stateId) userWhere.stateId = stateId;
  if (districtId) userWhere.districtId = districtId;
  if (users.length) {
    userWhere.mobileNumber = {
      in: users.filter((mobile) => !isExcludedAnalyticsMobile(mobile)),
    };
  }

  const scopedUsers = await prisma.user.findMany({
    where: userWhere,
    select: { name: true, mobileNumber: true, state: true, district: true },
  });

  const activeMobileNumbers = new Set(
    rangeRows.map((row) => row.user?.mobileNumber).filter(Boolean) as string[],
  );

  const lifetimeByUser = uniqueByUser(filterRowsBySelections(allRows, stateId, districtId, users));

  const inactiveList = scopedUsers
    .filter((user) => !activeMobileNumbers.has(user.mobileNumber))
    .map((user) => {
      const lifetime = lifetimeByUser.get(user.mobileNumber);
      return {
        name: user.name,
        mobileNumber: user.mobileNumber,
        state: user.state,
        district: user.district,
        lastSubmission: lifetime?.lastAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => {
      if (!a.lastSubmission && !b.lastSubmission) return a.mobileNumber.localeCompare(b.mobileNumber);
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
  const { period, fromDate, toDate, stateId, districtId, users } = parseUnifiedQuery(req.query);
  try {
    const allRows = await loadAllAnalyticsRows();
    const filteredRows = filterRowsBySelections(allRows, stateId, districtId, users);
    const range = resolveDashboardRange(period, fromDate, toDate);
    const rangeRows = rowsInRange(filteredRows, range);
    const filterOptions = await buildFilterOptions(stateId);
    const inactiveUsers = await buildInactiveUsers(allRows, rangeRows, stateId, districtId, users);

    const byState = uniqueByState(rangeRows);
    const byUser = uniqueByUser(rangeRows);

    const stateTotalChart = Array.from(byState.submissions.entries())
      .map(([state, keys]) => ({ state, uniqueCount: keys.size }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount);

    const stateContribution = contributionDistribution(
      stateTotalChart.map((item) => ({ name: item.state, uniqueCount: item.uniqueCount })),
    ).map((item) => ({
      state: item.name,
      uniqueCount: item.uniqueCount,
      percentage: Math.round(item.percentage),
    }));

    const userTopChart = Array.from(byUser.entries())
      .map(([mobileNumber, data]) => ({ name: data.name, mobileNumber, uniqueCount: data.keys.size }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount);

    const userChartTotal = userTopChart.reduce((sum, item) => sum + item.uniqueCount, 0);
    const userActivityDistribution = userTopChart.map((item) => ({
      name: item.name,
      mobileNumber: item.mobileNumber,
      uniqueCount: item.uniqueCount,
      percentage: userChartTotal ? Math.round((item.uniqueCount / userChartTotal) * 100) : 0,
    }));

    const stateLeaderboard = leaderboardFromRows(rangeRows, 'state').map((item) => ({
      rank: item.rank,
      state: item.name,
      totalSubmissions: item.totalSubmissions,
    }));

    const userLeaderboard = leaderboardFromRows(rangeRows, 'user').map((item) => {
      const entry = item as { rank: number; name: string; mobileNumber: string; totalSubmissions: number };
      return {
        rank: entry.rank,
        name: entry.name,
        mobileNumber: entry.mobileNumber,
        totalSubmissions: entry.totalSubmissions,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        lastUpdated: new Date().toISOString(),
        filters: { period, fromDate, toDate, stateId, districtId, users },
        filterOptions,
        summary: {
          totalSubmissions: countUniqueSubmissions(rangeRows),
          activeUsers: countActiveUsers(rangeRows),
          activeStates: countActiveStates(rangeRows),
          inactiveUsers: inactiveUsers.count,
        },
        inactiveUsers: inactiveUsers.list,
        states: {
          totalChart: stateTotalChart,
          contribution: stateContribution,
        },
        users: {
          topChart: userTopChart,
          activityDistribution: userActivityDistribution,
        },
        topPerformers: {
          states: stateLeaderboard,
          users: userLeaderboard,
        },
      },
    });
  } catch (error) {
    console.error('getUnifiedDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

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
