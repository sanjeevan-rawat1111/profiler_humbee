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
  prepareAnalyticsRows,
  resolveDashboardRange,
  rowsInRange,
  uniqueByDistrict,
  uniqueByRegion,
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

async function loadScopedAnalyticsRows(req: AuthenticatedRequest, options?: { skipDate?: boolean }) {
  const filters = parseFilterQuery(req.query);
  const scope = req.geographyScope ?? { unrestricted: true, districtIds: [], stateIds: [], regionIds: [] };
  const fetchOptions = await resolveSubmissionFetchOptions(filters, scope);
  const rows = await fetchFilteredSubmissions(prisma, filters, { ...fetchOptions, skipDate: options?.skipDate });
  return filterRowsByGeographyScope(prepareAnalyticsRows(rows), scope);
}

async function buildInactiveUsers(
  allRows: ReturnType<typeof prepareAnalyticsRows>,
  rangeRows: ReturnType<typeof prepareAnalyticsRows>,
  filters: ReturnType<typeof parseFilterQuery>,
  scope: AuthenticatedRequest['geographyScope'],
) {
  const userWhere: Record<string, unknown> = {
    role: 'user',
    mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
  };
  if (filters.districtId) {
    userWhere.districtId = filters.districtId;
  } else if (filters.stateId) {
    userWhere.stateId = filters.stateId;
  } else if (filters.regionId) {
    const regionStateIds = await resolveRegionStateIds(filters.regionId);
    userWhere.stateId = { in: regionStateIds.length ? regionStateIds : ['__none__'] };
  }
  if (filters.names.length) userWhere.name = { in: filters.names };
  if (filters.userMobiles.length) {
    userWhere.mobileNumber = {
      in: filters.userMobiles.filter((mobile) => !isExcludedAnalyticsMobile(mobile)),
    };
  }
  if (scope && !scope.unrestricted) {
    if (scope.districtIds.length) {
      userWhere.districtId = filters.districtId && scope.districtIds.includes(filters.districtId)
        ? filters.districtId
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

  const lifetimeByUser = uniqueByUser(allRows);

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
  const filters = parseFilterQuery(req.query);
  const scope = req.geographyScope ?? { unrestricted: true, districtIds: [], stateIds: [], regionIds: [] };

  try {
    const allRows = await loadScopedAnalyticsRows(req, { skipDate: true });
    const stateRegionMap = await loadStateRegionMap();
    const range = resolveDashboardRange(filters.period, filters.fromDate, filters.toDate);
    const rangeRows = rowsInRange(allRows, range);
    const filterOptions = await buildScopedFilterOptions(scope, filters.regionId, filters.stateId);
    const inactiveUsers = await buildInactiveUsers(allRows, rangeRows, filters, scope);

    const byState = uniqueByState(rangeRows);
    const byRegion = uniqueByRegion(rangeRows, stateRegionMap);
    const byDistrict = uniqueByDistrict(rangeRows);
    const byUser = uniqueByUser(rangeRows);

    const regionTotalChart = Array.from(byRegion.entries())
      .map(([region, keys]) => ({ region, uniqueCount: keys.size }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount);

    const regionContribution = contributionDistribution(
      regionTotalChart.map((item) => ({ name: item.region, uniqueCount: item.uniqueCount })),
    ).map((item) => ({
      region: item.name,
      uniqueCount: item.uniqueCount,
      percentage: Math.round(item.percentage),
    }));

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

    const districtTotalChart = Array.from(byDistrict.values())
      .map((entry) => ({
        district: entry.district,
        state: entry.state,
        uniqueCount: entry.keys.size,
      }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount);

    const districtContributionSources = districtTotalChart.map((item) => ({
      name: `${item.district}, ${item.state}`,
      district: item.district,
      state: item.state,
      uniqueCount: item.uniqueCount,
    }));
    const districtContribution = contributionDistribution(
      districtContributionSources.map((item) => ({ name: item.name, uniqueCount: item.uniqueCount })),
    ).map((item) => {
      const source = districtContributionSources.find((entry) => entry.name === item.name);
      return {
        district: source?.district ?? item.name,
        state: source?.state ?? '',
        label: item.name,
        uniqueCount: item.uniqueCount,
        percentage: Math.round(item.percentage),
      };
    });

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

    return res.status(200).json({
      success: true,
      data: {
        lastUpdated: new Date().toISOString(),
        filters: {
          period: filters.period,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          regionId: filters.regionId,
          stateId: filters.stateId,
          districtId: filters.districtId,
          names: filters.names,
          userMobiles: filters.userMobiles,
          sapCode: filters.sapCode,
          mobileNumber: filters.mobileNumber,
        },
        filterOptions,
        summary: {
          totalSubmissions: countUniqueSubmissions(rangeRows),
          activeUsers: countActiveUsers(rangeRows),
          activeStates: countActiveStates(rangeRows),
          inactiveUsers: inactiveUsers.count,
        },
        inactiveUsers: inactiveUsers.list,
        regions: {
          totalChart: regionTotalChart,
          contribution: regionContribution,
        },
        states: {
          totalChart: stateTotalChart,
          contribution: stateContribution,
        },
        districts: {
          totalChart: districtTotalChart,
          contribution: districtContribution,
        },
        users: {
          topChart: userTopChart,
          activityDistribution: userActivityDistribution,
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
