import { Response } from 'express';
import prisma from '../prisma/client';
import { excludedAnalyticsMobileNumbers, isExcludedAnalyticsMobile } from '../config/excludedAnalyticsUsers';
import { AuthenticatedRequest } from '../middleware/auth';
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
  geographyLeaderboardFromRows,
  GeographyLevel,
  leaderboardFromRows,
  parseArrayParam,
  prepareAnalyticsRows,
  resolveDashboardRange,
  rowsInRange,
  uniqueByState,
  uniqueByUser,
} from '../utils/dashboardAnalytics';
import {
  buildScopedFilterOptions,
  filterRowsByGeographyScope,
  loadStateRegionMap,
  resolveRegionStateIds,
  resolveSubmissionFetchOptions,
} from '../utils/geographyScope';

function parseUnifiedQuery(query: Record<string, unknown>) {
  const period = String(query.period || 'week');
  const fromDate = String(query.fromDate || '').trim();
  const toDate = String(query.toDate || '').trim();
  const regionId = String(query.regionId || '').trim();
  const stateId = String(query.stateId || '').trim();
  const districtId = String(query.districtId || '').trim();
  const geoLevel = (['region', 'state', 'district'].includes(String(query.geoLevel || 'state'))
    ? String(query.geoLevel)
    : 'state') as GeographyLevel;
  const users = parseArrayParam(query.users ?? query.user);
  return { period, fromDate, toDate, regionId, stateId, districtId, geoLevel, users };
}

async function loadScopedAnalyticsRows(req: AuthenticatedRequest) {
  const filters = parseFilterQuery({});
  const fetchOptions = await resolveSubmissionFetchOptions(filters, req.geographyScope);
  const rows = await fetchFilteredSubmissions(prisma, filters, fetchOptions);
  return filterRowsByGeographyScope(prepareAnalyticsRows(rows), req.geographyScope ?? { unrestricted: true, districtIds: [], stateIds: [], regionIds: [] });
}

async function buildInactiveUsers(
  allRows: ReturnType<typeof prepareAnalyticsRows>,
  rangeRows: ReturnType<typeof prepareAnalyticsRows>,
  regionId: string,
  stateId: string,
  districtId: string,
  users: string[],
  scope: AuthenticatedRequest['geographyScope'],
) {
  const userWhere: Record<string, unknown> = {
    role: 'user',
    mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
  };
  if (districtId) {
    userWhere.districtId = districtId;
  } else if (stateId) {
    userWhere.stateId = stateId;
  } else if (regionId) {
    const regionStateIds = await resolveRegionStateIds(regionId);
    userWhere.stateId = { in: regionStateIds.length ? regionStateIds : ['__none__'] };
  }
  if (users.length) {
    userWhere.mobileNumber = {
      in: users.filter((mobile) => !isExcludedAnalyticsMobile(mobile)),
    };
  }
  if (scope && !scope.unrestricted) {
    if (scope.districtIds.length) {
      userWhere.districtId = districtId && scope.districtIds.includes(districtId)
        ? districtId
        : { in: scope.districtIds };
    } else {
      userWhere.districtId = { in: ['__none__'] };
    }
  }

  const scopedUsers = await prisma.user.findMany({
    where: userWhere,
    select: { name: true, mobileNumber: true, state: true, district: true },
  });

  const activeMobileNumbers = new Set(
    rangeRows.map((row) => row.user?.mobileNumber).filter(Boolean) as string[],
  );

  const lifetimeByUser = uniqueByUser(filterRowsBySelections(allRows, regionId, stateId, districtId, users));

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

export async function getUnifiedDashboard(req: AuthenticatedRequest, res: Response) {
  const { period, fromDate, toDate, regionId, stateId, districtId, geoLevel, users } = parseUnifiedQuery(req.query);
  const scope = req.geographyScope ?? { unrestricted: true, districtIds: [], stateIds: [], regionIds: [] };

  const effectiveRegionId = scope.unrestricted
    ? regionId
    : (regionId && scope.regionIds.includes(regionId) ? regionId : regionId ? '__blocked__' : '');
  const effectiveStateId = scope.unrestricted
    ? stateId
    : (stateId && scope.stateIds.includes(stateId) ? stateId : stateId ? '__blocked__' : '');
  const effectiveDistrictId = scope.unrestricted
    ? districtId
    : (districtId && scope.districtIds.includes(districtId) ? districtId : districtId ? '__blocked__' : '');

  try {
    const allRows = await loadScopedAnalyticsRows(req);
    const stateRegionMap = await loadStateRegionMap();
    const regionStateIds = effectiveRegionId ? await resolveRegionStateIds(effectiveRegionId) : undefined;
    const filteredRows = filterRowsBySelections(
      allRows,
      effectiveRegionId,
      effectiveStateId,
      effectiveDistrictId,
      users,
      stateRegionMap,
      regionStateIds,
    );
    const range = resolveDashboardRange(period, fromDate, toDate);
    const rangeRows = rowsInRange(filteredRows, range);
    const filterOptions = await buildScopedFilterOptions(scope, effectiveRegionId, effectiveStateId);
    const inactiveUsers = await buildInactiveUsers(
      allRows,
      rangeRows,
      effectiveRegionId,
      effectiveStateId,
      effectiveDistrictId,
      users,
      scope,
    );

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

    const geographyLeaderboard = geographyLeaderboardFromRows(rangeRows, geoLevel, stateRegionMap);
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
        filters: {
          period,
          fromDate,
          toDate,
          regionId: effectiveRegionId,
          stateId: effectiveStateId,
          districtId: effectiveDistrictId,
          geoLevel,
          users,
        },
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
          geography: geographyLeaderboard,
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

export async function getTodayDashboard(req: AuthenticatedRequest, res: Response) {
  req.query = { ...req.query, period: 'today' };
  return getUnifiedDashboard(req, res);
}

export async function getRegionDashboard(req: AuthenticatedRequest, res: Response) {
  return getUnifiedDashboard(req, res);
}

export async function getUserDashboard(req: AuthenticatedRequest, res: Response) {
  return getUnifiedDashboard(req, res);
}

export async function getLeaderboardDashboard(req: AuthenticatedRequest, res: Response) {
  const period = String(req.query.period || 'today');
  req.query = { ...req.query, period };
  return getUnifiedDashboard(req, res);
}
