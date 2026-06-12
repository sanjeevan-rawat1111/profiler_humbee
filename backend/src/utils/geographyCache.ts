type GeographyCache = {
  stateRegionMap?: Map<string, { regionId: string | null; regionName: string }>;
  regionStateMap?: Map<string, string[]>;
  expiresAt: number;
};

const cache: GeographyCache = {
  expiresAt: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const regionStateCache = new Map<string, string[]>();

export function isCacheValid() {
  return Date.now() < cache.expiresAt;
}

export function setCache(data: Partial<GeographyCache>) {
  Object.assign(cache, data);
  cache.expiresAt = Date.now() + CACHE_TTL;
}

export function getCache() {
  return cache;
}

export function getCachedRegionStateIds(regionId: string) {
  return regionStateCache.get(regionId);
}

export function setCachedRegionStateIds(regionId: string, stateIds: string[]) {
  regionStateCache.set(regionId, stateIds);
}

export function clearRegionStateCache() {
  cache.stateRegionMap = undefined;
  cache.regionStateMap = undefined;
  cache.expiresAt = 0;
  regionStateCache.clear();
}
