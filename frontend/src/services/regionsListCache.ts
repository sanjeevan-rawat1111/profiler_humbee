import api from './api';
import type { GeoRegionDetail } from '../types/geo';

const CACHE_TTL_MS = 5 * 60 * 1000;

type RegionsListCacheEntry = {
  regions: GeoRegionDetail[];
  timestamp: number;
};

let cache: RegionsListCacheEntry | null = null;
let inflight: Promise<GeoRegionDetail[]> | null = null;

function isExpired(timestamp: number) {
  return Date.now() - timestamp >= CACHE_TTL_MS;
}

export function peekRegionsList(): GeoRegionDetail[] | null {
  if (!cache || isExpired(cache.timestamp)) return null;
  return cache.regions;
}

export function invalidateRegionsList() {
  cache = null;
  inflight = null;
}

export async function loadRegionsList(force = false): Promise<GeoRegionDetail[]> {
  if (!force && cache && !isExpired(cache.timestamp)) {
    console.log('Regions list cache HIT');
    return cache.regions;
  }

  if (!force && inflight) {
    return inflight;
  }

  console.log('Regions list cache MISS');
  console.log('Fetching regions from API');

  if (force) {
    invalidateRegionsList();
  }

  inflight = api.get('/api/internal/regions')
    .then((res) => {
      const regions: GeoRegionDetail[] = res.data.data ?? [];
      cache = { regions, timestamp: Date.now() };
      return regions;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
