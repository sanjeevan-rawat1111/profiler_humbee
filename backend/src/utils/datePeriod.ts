export type DatePeriod = 'today' | 'week' | 'month' | 'custom';

export function normalizePeriod(value: string): DatePeriod {
  if (value === 'today') return 'today';
  if (value === 'week' || value === '7') return 'week';
  if (value === 'month' || value === '30') return 'month';
  return 'custom';
}

export function parsePeriodQuery(query: Record<string, unknown>) {
  const period = normalizePeriod(String(query.period || 'week'));
  const fromDate = String(query.fromDate || query.customStart || '').trim();
  const toDate = String(query.toDate || query.customEnd || '').trim();
  return { period, fromDate, toDate };
}

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

export function resolvePeriodRange(period: DatePeriod, fromDate?: string, toDate?: string) {
  if (period === 'today') return getTodayRange();
  if (period === 'week') return getWeekRange();
  if (period === 'month') return getMonthRange();
  return getCustomRange(fromDate, toDate) ?? getWeekRange();
}

export function periodToDateRange(query: Record<string, unknown>) {
  const { period, fromDate, toDate } = parsePeriodQuery(query);
  return resolvePeriodRange(period, fromDate, toDate);
}
