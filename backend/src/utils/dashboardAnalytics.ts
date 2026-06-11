import {
  SubmissionRow,
  countUniqueSubmissions,
  filterAnalyticsRows,
  toDateKey,
  uniqueSubmissionKey,
} from './submissionFilters';

export function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

export function getWeekRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { gte: start, lte: end };
}

export function getMonthRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return { gte: start, lte: end };
}

export function getCustomRange(fromDate?: string, toDate?: string) {
  if (!fromDate && !toDate) return undefined;
  const start = fromDate ? new Date(fromDate) : new Date(0);
  const end = toDate ? new Date(toDate) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

export function rowsInRange(rows: SubmissionRow[], range: { gte: Date; lte: Date }) {
  return rows.filter((row) => row.submittedAt >= range.gte && row.submittedAt <= range.lte);
}

export function uniqueByUser(rows: SubmissionRow[]) {
  const map = new Map<string, { name: string; state: string; district: string; keys: Set<string>; lastAt: Date }>();
  rows.forEach((row) => {
    if (!row.user) return;
    const mobileNumber = row.user.mobileNumber;
    if (!map.has(mobileNumber)) {
      map.set(mobileNumber, {
        name: row.user.name,
        state: row.user.state,
        district: row.user.district,
        keys: new Set(),
        lastAt: row.submittedAt,
      });
    }
    const entry = map.get(mobileNumber)!;
    entry.keys.add(uniqueSubmissionKey(row));
    if (row.submittedAt > entry.lastAt) entry.lastAt = row.submittedAt;
  });
  return map;
}

export function uniqueByState(rows: SubmissionRow[]) {
  const map = new Map<string, Set<string>>();
  const usersByState = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!row.user) return;
    const state = row.user.state || 'Unknown';
    if (!map.has(state)) map.set(state, new Set());
    map.get(state)?.add(uniqueSubmissionKey(row));
    if (!usersByState.has(state)) usersByState.set(state, new Set());
    usersByState.get(state)?.add(row.user.mobileNumber);
  });
  return { submissions: map, users: usersByState };
}

export function uniqueByDistrict(rows: SubmissionRow[]) {
  const map = new Map<string, { district: string; state: string; keys: Set<string> }>();
  rows.forEach((row) => {
    if (!row.user) return;
    const district = row.user.district || 'Unknown';
    const state = row.user.state || 'Unknown';
    const key = `${state}\0${district}`;
    if (!map.has(key)) map.set(key, { district, state, keys: new Set() });
    map.get(key)?.keys.add(uniqueSubmissionKey(row));
  });
  return map;
}

export function uniqueByRegion(
  rows: SubmissionRow[],
  stateRegionMap: Map<string, { regionId: string | null; regionName: string }>,
) {
  const map = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!row.user) return;
    const info = stateRegionMap.get(row.user.stateId || '');
    const region = info?.regionName || 'Unassigned';
    if (!map.has(region)) map.set(region, new Set());
    map.get(region)?.add(uniqueSubmissionKey(row));
  });
  return map;
}

export function topEntry<T extends string>(map: Map<T, Set<string>>): { name: T; count: number } | null {
  let best: { name: T; count: number } | null = null;
  map.forEach((keys, name) => {
    if (!best || keys.size > best.count) best = { name, count: keys.size };
  });
  return best;
}

export function trendByState(rows: SubmissionRow[], range: { gte: Date; lte: Date }) {
  const byDayState = new Map<string, Map<string, Set<string>>>();
  rowsInRange(rows, range).forEach((row) => {
    if (!row.user) return;
    const day = toDateKey(row.submittedAt);
    const state = row.user.state || 'Unknown';
    if (!byDayState.has(day)) byDayState.set(day, new Map());
    const dayMap = byDayState.get(day)!;
    if (!dayMap.has(state)) dayMap.set(state, new Set());
    dayMap.get(state)?.add(uniqueSubmissionKey(row));
  });

  const cursor = new Date(range.gte);
  while (cursor <= range.lte) {
    const day = toDateKey(cursor);
    if (!byDayState.has(day)) byDayState.set(day, new Map());
    cursor.setDate(cursor.getDate() + 1);
  }

  const states = [...new Set(rows.map((r) => r.user?.state || 'Unknown'))];
  return Array.from(byDayState.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stateMap]) => {
      const point: Record<string, string | number> = { date };
      states.forEach((state) => {
        point[state] = stateMap.get(state)?.size ?? 0;
      });
      return point;
    });
}

export function prepareAnalyticsRows(rows: SubmissionRow[]) {
  return filterAnalyticsRows(rows);
}

export function countActiveStatesToday(todayRows: SubmissionRow[]) {
  return new Set(todayRows.map((r) => r.user?.state).filter(Boolean)).size;
}

export function resolveDashboardRange(
  period: string,
  fromDate?: string,
  toDate?: string,
): { gte: Date; lte: Date } {
  if (period === 'custom') {
    return getCustomRange(fromDate, toDate) ?? getMonthRange();
  }
  if (period === 'today') return getTodayRange();
  if (period === 'week') return getWeekRange();
  return getMonthRange();
}

export function parseArrayParam(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }
  const str = String(value).trim();
  if (!str) return [];
  return [...new Set(str.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function filterRowsBySelections(
  rows: SubmissionRow[],
  regionId: string,
  stateId: string,
  districtId: string,
  users: string[],
  stateRegionMap?: Map<string, { regionId: string | null; regionName: string }>,
  regionStateIds?: string[],
) {
  return rows.filter((row) => {
    if (!row.user) return false;
    if (regionId === '__blocked__' || stateId === '__blocked__' || districtId === '__blocked__') return false;
    if (regionId && stateRegionMap) {
      const info = stateRegionMap.get(row.user.stateId || '');
      if (!info || info.regionId !== regionId) return false;
    } else if (regionStateIds?.length && row.user.stateId && !regionStateIds.includes(row.user.stateId)) {
      return false;
    }
    if (stateId && row.user.stateId !== stateId) return false;
    if (districtId && row.user.districtId !== districtId) return false;
    if (users.length && !users.includes(row.user.mobileNumber)) return false;
    return true;
  });
}

export type GeographyLevel = 'region' | 'state' | 'district';

export function geographyLeaderboardFromRows(
  rows: SubmissionRow[],
  level: GeographyLevel,
  stateRegionMap: Map<string, { regionId: string | null; regionName: string }>,
) {
  const byGeo = new Map<string, { name: string; submissions: Set<string>; users: Set<string> }>();

  rows.forEach((row) => {
    if (!row.user) return;
    let key = '';
    let name = 'Unknown';

    if (level === 'district') {
      key = row.user.districtId || row.user.district || 'unknown';
      name = row.user.district || 'Unknown';
    } else if (level === 'state') {
      key = row.user.stateId || row.user.state || 'unknown';
      name = row.user.state || 'Unknown';
    } else {
      const info = stateRegionMap.get(row.user.stateId || '');
      key = info?.regionId || 'unassigned';
      name = info?.regionName || 'Unassigned';
    }

    if (!byGeo.has(key)) {
      byGeo.set(key, { name, submissions: new Set(), users: new Set() });
    }
    const entry = byGeo.get(key)!;
    entry.submissions.add(uniqueSubmissionKey(row));
    if (row.user.mobileNumber) entry.users.add(row.user.mobileNumber);
  });

  const totalSubmissions = [...byGeo.values()].reduce((sum, entry) => sum + entry.submissions.size, 0);

  return Array.from(byGeo.values())
    .map((entry) => ({
      name: entry.name,
      totalSubmissions: entry.submissions.size,
      activeUsers: entry.users.size,
      contributionPct: totalSubmissions
        ? Math.round((entry.submissions.size / totalSubmissions) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.totalSubmissions - a.totalSubmissions || b.activeUsers - a.activeUsers)
    .map((item, index) => ({ rank: index + 1, ...item }));
}

export function trendByUser(rows: SubmissionRow[], range: { gte: Date; lte: Date }) {
  const byDayUser = new Map<string, Map<string, Set<string>>>();
  rowsInRange(rows, range).forEach((row) => {
    if (!row.user) return;
    const day = toDateKey(row.submittedAt);
    const mobileNumber = row.user.mobileNumber;
    if (!byDayUser.has(day)) byDayUser.set(day, new Map());
    const dayMap = byDayUser.get(day)!;
    if (!dayMap.has(mobileNumber)) dayMap.set(mobileNumber, new Set());
    dayMap.get(mobileNumber)?.add(uniqueSubmissionKey(row));
  });

  const cursor = new Date(range.gte);
  while (cursor <= range.lte) {
    const day = toDateKey(cursor);
    if (!byDayUser.has(day)) byDayUser.set(day, new Map());
    cursor.setDate(cursor.getDate() + 1);
  }

  const mobileNumbers = [...new Set(rows.map((r) => r.user?.mobileNumber).filter(Boolean))] as string[];
  return Array.from(byDayUser.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, userMap]) => {
      const point: Record<string, string | number> = { date };
      mobileNumbers.forEach((mobileNumber) => {
        point[mobileNumber] = userMap.get(mobileNumber)?.size ?? 0;
      });
      return point;
    });
}

export function contributionDistribution(items: { name: string; uniqueCount: number }[]) {
  const total = items.reduce((sum, item) => sum + item.uniqueCount, 0);
  return items.map((item) => ({
    name: item.name,
    uniqueCount: item.uniqueCount,
    percentage: total ? Math.round((item.uniqueCount / total) * 1000) / 10 : 0,
  }));
}

export function countActiveUsers(rows: SubmissionRow[]) {
  return new Set(rows.map((r) => r.user?.mobileNumber).filter(Boolean)).size;
}

export function countActiveStates(rows: SubmissionRow[]) {
  return new Set(rows.map((r) => r.user?.state).filter(Boolean)).size;
}

export function leaderboardFromRows(rows: SubmissionRow[], mode: 'state' | 'user') {
  if (mode === 'state') {
    const { submissions } = uniqueByState(rows);
    return Array.from(submissions.entries())
      .map(([state, keys]) => ({ name: state, totalSubmissions: keys.size }))
      .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
      .map((item, index) => ({ rank: index + 1, ...item }));
  }
  const byUser = uniqueByUser(rows);
  return Array.from(byUser.entries())
    .map(([mobileNumber, data]) => ({ name: data.name, mobileNumber, totalSubmissions: data.keys.size }))
    .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
    .map((item, index) => ({ rank: index + 1, ...item }));
}
