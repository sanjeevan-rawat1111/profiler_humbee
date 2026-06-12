import api from './api';
import type { GeoRegion, GeoState } from '../types/geo';

const CACHE_TTL_MS = 5 * 60 * 1000;

type GeoCatalogBundle = {
  regions: GeoRegion[];
  states: GeoState[];
  timestamp: number;
};

let bundleCache: GeoCatalogBundle | null = null;
let bundlePromise: Promise<GeoCatalogBundle> | null = null;

function isExpired(timestamp: number) {
  return Date.now() - timestamp >= CACHE_TTL_MS;
}

export function peekManagementGeoCatalog(): { regions: GeoRegion[]; states: GeoState[] } | null {
  if (!bundleCache || isExpired(bundleCache.timestamp)) return null;
  return { regions: bundleCache.regions, states: bundleCache.states };
}

export function invalidateGeoCatalog() {
  bundleCache = null;
  bundlePromise = null;
}

export async function loadManagementGeoCatalog(force = false): Promise<{ regions: GeoRegion[]; states: GeoState[] }> {
  if (!force && bundleCache && !isExpired(bundleCache.timestamp)) {
    console.log('Geography cache HIT');
    return { regions: bundleCache.regions, states: bundleCache.states };
  }

  if (!force && bundlePromise) {
    const bundle = await bundlePromise;
    return { regions: bundle.regions, states: bundle.states };
  }

  console.log('Geography cache MISS');
  console.log('Fetching regions/states from API');

  if (force) {
    invalidateGeoCatalog();
  }

  if (!bundlePromise) {
    bundlePromise = Promise.all([
      api.get('/api/internal/geo/regions'),
      api.get('/api/internal/geo/states'),
    ])
      .then(([regionsRes, statesRes]) => {
        const bundle: GeoCatalogBundle = {
          regions: regionsRes.data.data ?? [],
          states: statesRes.data.data ?? [],
          timestamp: Date.now(),
        };
        bundleCache = bundle;
        return bundle;
      })
      .finally(() => {
        bundlePromise = null;
      });
  }

  const bundle = await bundlePromise;
  return { regions: bundle.regions, states: bundle.states };
}

export async function loadRegions(): Promise<GeoRegion[]> {
  const { regions } = await loadManagementGeoCatalog();
  return regions;
}

export async function loadStates(regionId?: string): Promise<GeoState[]> {
  const { states } = await loadManagementGeoCatalog();
  if (!regionId) return states;
  return states.filter((state) => state.regionId === regionId);
}
