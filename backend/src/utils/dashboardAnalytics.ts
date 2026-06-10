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
  const map = new Map<string, { region: string; keys: Set<string>; lastAt: Date }>();
  rows.forEach((row) => {
    if (!row.user) return;
    const mobileNumber = row.user.mobileNumber;
    if (!map.has(mobileNumber)) {
      map.set(mobileNumber, { region: row.user.region, keys: new Set(), lastAt: row.submittedAt });
    }
    const entry = map.get(mobileNumber)!;
    entry.keys.add(uniqueSubmissionKey(row));
    if (row.submittedAt > entry.lastAt) entry.lastAt = row.submittedAt;
  });
  return map;
}

export function uniqueByRegion(rows: SubmissionRow[]) {
  const map = new Map<string, Set<string>>();
  const usersByRegion = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!row.user) return;
    const region = row.user.region || 'Unknown';
    if (!map.has(region)) map.set(region, new Set());
    map.get(region)?.add(uniqueSubmissionKey(row));
    if (!usersByRegion.has(region)) usersByRegion.set(region, new Set());
    usersByRegion.get(region)?.add(row.user.mobileNumber);
  });
  return { submissions: map, users: usersByRegion };
}

export function topEntry<T extends string>(map: Map<T, Set<string>>): { name: T; count: number } | null {
  let best: { name: T; count: number } | null = null;
  map.forEach((keys, name) => {
    if (!best || keys.size > best.count) best = { name, count: keys.size };
  });
  return best;
}

export function trendByRegion(rows: SubmissionRow[], range: { gte: Date; lte: Date }) {
  const byDayRegion = new Map<string, Map<string, Set<string>>>();
  rowsInRange(rows, range).forEach((row) => {
    if (!row.user) return;
    const day = toDateKey(row.submittedAt);
    const region = row.user.region || 'Unknown';
    if (!byDayRegion.has(day)) byDayRegion.set(day, new Map());
    const dayMap = byDayRegion.get(day)!;
    if (!dayMap.has(region)) dayMap.set(region, new Set());
    dayMap.get(region)?.add(uniqueSubmissionKey(row));
  });

  const cursor = new Date(range.gte);
  while (cursor <= range.lte) {
    const day = toDateKey(cursor);
    if (!byDayRegion.has(day)) byDayRegion.set(day, new Map());
    cursor.setDate(cursor.getDate() + 1);
  }

  const regions = [...new Set(rows.map((r) => r.user?.region || 'Unknown'))];
  return Array.from(byDayRegion.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, regionMap]) => {
      const point: Record<string, string | number> = { date };
      regions.forEach((region) => {
        point[region] = regionMap.get(region)?.size ?? 0;
      });
      return point;
    });
}

export function prepareAnalyticsRows(rows: SubmissionRow[]) {
  return filterAnalyticsRows(rows);
}

export function countActiveRegionsToday(todayRows: SubmissionRow[]) {
  return new Set(todayRows.map((r) => r.user?.region).filter(Boolean)).size;
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
  regions: string[],
  users: string[],
) {
  return rows.filter((row) => {
    if (!row.user) return false;
    if (regions.length && !regions.includes(row.user.region)) return false;
    if (users.length && !users.includes(row.user.mobileNumber)) return false;
    return true;
  });
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

export function countActiveRegions(rows: SubmissionRow[]) {
  return new Set(rows.map((r) => r.user?.region).filter(Boolean)).size;
}

export function leaderboardFromRows(rows: SubmissionRow[], mode: 'region' | 'user') {
  if (mode === 'region') {
    const { submissions } = uniqueByRegion(rows);
    return Array.from(submissions.entries())
      .map(([region, keys]) => ({ name: region, totalSubmissions: keys.size }))
      .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
      .map((item, index) => ({ rank: index + 1, ...item }));
  }
  const byUser = uniqueByUser(rows);
  return Array.from(byUser.entries())
    .map(([mobileNumber, data]) => ({ name: mobileNumber, totalSubmissions: data.keys.size }))
    .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
    .map((item, index) => ({ rank: index + 1, ...item }));
}
