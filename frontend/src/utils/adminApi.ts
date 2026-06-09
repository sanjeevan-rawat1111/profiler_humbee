import type { SubmissionFilters, GlobalDashboardFilters, UserManagementFilters } from '../types/admin';
import api from '../services/api';

export function buildFilterParams(filters: SubmissionFilters, extra: Record<string, string | number> = {}) {
  const params: Record<string, string | number> = { ...extra };
  if (filters.search) params.search = filters.search;
  if (filters.user) params.user = filters.user;
  if (filters.region) params.region = filters.region;
  if (filters.sapCode) params.sapCode = filters.sapCode;
  if (filters.mobileNumber) params.mobileNumber = filters.mobileNumber;
  if (filters.singleDay) {
    params.singleDay = 'true';
    if (filters.date) params.date = filters.date;
  } else {
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
  }
  if (filters.period) params.period = filters.period;
  return params;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadExport(url: string, filename: string, params: Record<string, string | number>) {
  const res = await api.get(url, { params, responseType: 'blob' });
  downloadBlob(res.data, filename);
}

export function buildDashboardParams(filters: GlobalDashboardFilters) {
  const params: Record<string, string> = { period: filters.period };
  if (filters.period === 'custom') {
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
  }
  if (filters.regions.length) params.regions = filters.regions.join(',');
  if (filters.users.length) params.users = filters.users.join(',');
  return params;
}

export function buildUserMgmtParams(filters: UserManagementFilters) {
  const params: Record<string, string> = {};
  if (filters.region) params.region = filters.region;
  if (filters.users.length) params.users = filters.users.join(',');
  if (filters.statuses.length) params.status = filters.statuses.join(',');
  return params;
}

export function formatCount(value: unknown) {
  return Math.round(Number(value) || 0);
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
