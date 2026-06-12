import type { DBUser, UserManagementFilters } from '../types/admin';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type UsersCacheData = {
  users: DBUser[];
  mobileNumbers: string[];
};

type UsersCacheEntry = UsersCacheData & {
  timestamp: number;
};

const cache = new Map<string, UsersCacheEntry>();

export function buildUsersCacheKey(filters: UserManagementFilters): string {
  return JSON.stringify({
    regionId: filters.regionId,
    stateId: filters.stateId,
    districtId: filters.districtId,
    names: [...filters.names].sort(),
    mobileNumbers: [...filters.mobileNumbers].sort(),
    role: filters.role,
    statuses: [...filters.statuses].sort(),
  });
}

export function getUsersCache(cacheKey: string): UsersCacheData | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }

  return {
    users: entry.users,
    mobileNumbers: entry.mobileNumbers,
  };
}

export function setUsersCache(cacheKey: string, data: UsersCacheData) {
  cache.set(cacheKey, {
    ...data,
    timestamp: Date.now(),
  });
}

export function invalidateUsersCache(cacheKey?: string) {
  if (cacheKey) {
    cache.delete(cacheKey);
    return;
  }
  cache.clear();
}
