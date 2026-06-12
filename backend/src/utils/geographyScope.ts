import prisma from '../prisma/client';
import { excludedAnalyticsMobileNumbers } from '../config/excludedAnalyticsUsers';
import type { SubmissionRow, parseFilterQuery } from './submissionFilters';
import { getCache, setCache, isCacheValid } from './geographyCache';
import {
  filterDistricts,
  filterStates,
  getAllStates,
  getDistrictIdsForStateIds,
} from '../data/staticGeography';

export type GeographyScope = {
  unrestricted: boolean;
  districtIds: string[];
  stateIds: string[];
  regionIds: string[];
};

export async function resolveRegionStateIds(regionId: string): Promise<string[]> {
  const cache = getCache();

  if (
    isCacheValid() &&
    cache.regionStateMap?.has(regionId)
  ) {
    return cache.regionStateMap.get(regionId)!;
  }
  const mappings = await prisma.regionState.findMany({
    where: { regionId },
    select: { stateId: true },
  });
  const stateIds = mappings.map((m) => m.stateId);

  const map = cache.regionStateMap ?? new Map();

  map.set(regionId, stateIds);

  setCache({
    regionStateMap: map,
  });

  return stateIds;
}

export async function resolveGeographyScope(userId: string, role: string): Promise<GeographyScope> {
  if (role === 'admin') {
    return { unrestricted: true, districtIds: [], stateIds: [], regionIds: [] };
  }

  if (role !== 'manager') {
    return { unrestricted: false, districtIds: [], stateIds: [], regionIds: [] };
  }

  const userRegions = await prisma.userRegion.findMany({
    where: { userId },
    select: { regionId: true },
  });
  const regionIds = userRegions.map((entry) => entry.regionId);
  if (!regionIds.length) {
    return { unrestricted: false, districtIds: [], stateIds: [], regionIds: [] };
  }

  const stateMappings = await prisma.regionState.findMany({
    where: { regionId: { in: regionIds } },
    select: { stateId: true },
  });
  const stateIds = [...new Set(stateMappings.map((mapping) => mapping.stateId))];

  return {
    unrestricted: false,
    districtIds: getDistrictIdsForStateIds(stateIds),
    stateIds,
    regionIds,
  };
}

export function intersectWithScope(requestedId: string | undefined, allowedIds: string[]): string | undefined {
  if (!requestedId) return undefined;
  if (!allowedIds.length) return requestedId;
  return allowedIds.includes(requestedId) ? requestedId : undefined;
}

export function intersectListWithScope(requestedIds: string[], allowedIds: string[]): string[] {
  if (!allowedIds.length) return requestedIds;
  if (!requestedIds.length) return allowedIds;
  return requestedIds.filter((id) => allowedIds.includes(id));
}

export function applyDistrictScopeToUserWhere(
  userFilter: Record<string, unknown>,
  scope: GeographyScope,
): Record<string, unknown> {
  if (scope.unrestricted) return userFilter;
  if (!scope.districtIds.length) {
    userFilter.districtId = { in: ['__none__'] };
    return userFilter;
  }
  if (userFilter.districtId) {
    const requested = String(userFilter.districtId);
    userFilter.districtId = scope.districtIds.includes(requested) ? requested : { in: ['__none__'] };
  } else {
    userFilter.districtId = { in: scope.districtIds };
  }
  return userFilter;
}

export function applyStateScopeToUserWhere(
  userFilter: Record<string, unknown>,
  scope: GeographyScope,
): Record<string, unknown> {
  if (scope.unrestricted) return userFilter;
  if (!scope.stateIds.length) {
    userFilter.stateId = { in: ['__none__'] };
    return userFilter;
  }
  if (userFilter.stateId) {
    const requested = String(userFilter.stateId);
    userFilter.stateId = scope.stateIds.includes(requested) ? requested : { in: ['__none__'] };
  } else {
    userFilter.stateId = { in: scope.stateIds };
  }
  return userFilter;
}

export function filterRowsByGeographyScope(rows: SubmissionRow[], scope: GeographyScope): SubmissionRow[] {
  if (scope.unrestricted) return rows;
  if (!scope.districtIds.length) return [];
  return rows.filter((row) => row.user?.districtId && scope.districtIds.includes(row.user.districtId));
}

export async function loadStateRegionMap(): Promise<Map<string, { regionId: string | null; regionName: string }>> {
  const cache = getCache();

  if (isCacheValid() && cache.stateRegionMap) {
    return cache.stateRegionMap;
  }

  const mappings = await prisma.regionState.findMany({
    select: {
      stateId: true,
      regionId: true,
      region: { select: { regionName: true } },
    },
  });

  const map = new Map<string, { regionId: string | null; regionName: string }>();
  getAllStates().forEach((state) => {
    map.set(state.id, { regionId: null, regionName: 'Unassigned' });
  });
  mappings.forEach((mapping) => {
    map.set(mapping.stateId, {
      regionId: mapping.regionId,
      regionName: mapping.region.regionName,
    });
  });

  setCache({ stateRegionMap: map });
  return map;
}

export async function buildScopedFilterOptions(scope: GeographyScope, regionId: string, stateId: string) {
  const regionStateIds = regionId ? await resolveRegionStateIds(regionId) : [];

  let states = filterStates({
    regionStateIds: regionId ? (regionStateIds.length ? regionStateIds : ['__none__']) : undefined,
  });
  if (!scope.unrestricted && scope.stateIds.length) {
    states = states.filter((state) => scope.stateIds.includes(state.id));
  } else if (!scope.unrestricted) {
    states = [];
  }

  let districts = stateId ? filterDistricts({ stateId }) : [];
  if (!scope.unrestricted && scope.districtIds.length) {
    districts = districts.filter((district) => scope.districtIds.includes(district.id));
  }

  const userWhere: Record<string, unknown> = {
    role: 'user',
    mobileNumber: { notIn: excludedAnalyticsMobileNumbers() },
  };
  if (districts.length && !scope.unrestricted && scope.districtIds.length) {
    userWhere.districtId = { in: districts.map((district) => district.id) };
  } else if (stateId) {
    userWhere.stateId = stateId;
  } else if (regionId) {
    userWhere.stateId = { in: regionStateIds.length ? regionStateIds : ['__none__'] };
  } else if (!scope.unrestricted && scope.districtIds.length) {
    userWhere.districtId = { in: scope.districtIds };
  } else if (!scope.unrestricted && scope.stateIds.length) {
    userWhere.stateId = { in: scope.stateIds };
  }

  const [regions, dbUsers, mappings] = await Promise.all([
    prisma.region.findMany({
      where: scope.unrestricted
        ? { status: 'active' }
        : scope.regionIds.length
          ? { id: { in: scope.regionIds }, status: 'active' }
          : { id: { in: ['__none__'] } },
      select: { id: true, regionName: true, regionCode: true },
      orderBy: { regionName: 'asc' },
    }),
    prisma.user.findMany({
      where: userWhere,
      select: { name: true, mobileNumber: true, stateId: true, districtId: true, state: true, district: true },
      orderBy: { mobileNumber: 'asc' },
    }),
    prisma.regionState.findMany({
      select: { stateId: true, regionId: true },
    }),
  ]);

  const mappingMap = new Map(mappings.map((m) => [m.stateId, m.regionId]));
  const statesWithRegion = states.map((state) => ({
    ...state,
    regionId: mappingMap.get(state.id) ?? null,
  }));

  return {
    regions,
    states: statesWithRegion,
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

export async function resolveSubmissionFetchOptions(
  filters: ReturnType<typeof parseFilterQuery>,
  scope?: GeographyScope,
) {
  let regionStateIds: string[] | undefined;
  if (filters.regionId) {
    regionStateIds = await resolveRegionStateIds(filters.regionId);
  }
  return {
    regionStateIds,
    scopeDistrictIds: scope && !scope.unrestricted ? scope.districtIds : undefined,
  };
}
