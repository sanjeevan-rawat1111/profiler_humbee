import type {
  SubmissionFilters,
  GlobalDashboardFilters,
  UserManagementFilters,
  AuditFilters,
  DashboardPeriod,
} from '../types/admin';
import api from '../services/api';

export function buildPeriodParams(period: DashboardPeriod, fromDate: string, toDate: string) {
  const params: Record<string, string> = { period };
  if (period === 'custom') {
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
  }
  return params;
}

export function buildFilterParams(filters: SubmissionFilters, extra: Record<string, string | number> = {}) {
  const params: Record<string, string | number> = {
    ...buildPeriodParams(filters.period, filters.fromDate, filters.toDate),
    ...extra,
  };
  if (filters.search) params.search = filters.search;
  if (filters.user) params.user = filters.user;
  if (filters.regionId) params.regionId = filters.regionId;
  if (filters.stateId) params.stateId = filters.stateId;
  if (filters.districtId) params.districtId = filters.districtId;
  if (filters.sapCode) params.sapCode = filters.sapCode;
  if (filters.mobileNumber) params.mobileNumber = filters.mobileNumber;
  return params;
}

export function buildAuditParams(filters: AuditFilters, extra: Record<string, string | number> = {}) {
  const params: Record<string, string | number> = {
    ...buildPeriodParams(filters.period, filters.fromDate, filters.toDate),
    ...extra,
  };
  if (filters.search) params.search = filters.search;
  if (filters.name) params.name = filters.name;
  if (filters.user) params.user = filters.user;
  if (filters.regionId) params.regionId = filters.regionId;
  if (filters.stateId) params.stateId = filters.stateId;
  if (filters.districtId) params.districtId = filters.districtId;
  if (filters.eventType) params.eventType = filters.eventType;
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
  const params: Record<string, string> = buildPeriodParams(filters.period, filters.fromDate, filters.toDate);
  if (filters.regionId) params.regionId = filters.regionId;
  if (filters.stateId) params.stateId = filters.stateId;
  if (filters.districtId) params.districtId = filters.districtId;
  if (filters.geoLevel) params.geoLevel = filters.geoLevel;
  if (filters.users.length) params.users = filters.users.join(',');
  return params;
}

export function buildUserMgmtParams(filters: UserManagementFilters) {
  const params: Record<string, string> = {};
  if (filters.regionId) params.regionId = filters.regionId;
  if (filters.stateId) params.stateId = filters.stateId;
  if (filters.districtId) params.districtId = filters.districtId;
  if (filters.role) params.role = filters.role;
  if (filters.mobileNumbers.length) params.mobileNumbers = filters.mobileNumbers.join(',');
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
