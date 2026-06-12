import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AlertCircle } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import SubmissionFiltersBar from '../components/admin/SubmissionFilters';
import UserDirectoryTab from '../components/admin/UserDirectoryTab';
import AnalyticsDashboardTab from '../components/admin/AnalyticsDashboardTab';
import AuditLogsTab from '../components/admin/AuditLogsTab';
import ManagementTab, { type ManagementSubTab } from '../components/admin/ManagementTab';
import { defaultAuditFilters, defaultFilters, defaultUserManagementFilters } from '../types/admin';
import type {
  AuditSummaryRecord,
  DirectoryDownloadMode,
  SubmissionFilters,
  DirectoryRecord,
  DBUser,
  UserManagementFilters,
  AuditFilters,
  UnifiedDashboardData,
} from '../types/admin';
import { buildAuditParams, buildFilterParams, buildUserMgmtParams, downloadExport } from '../utils/adminApi';
import {
  buildUsersCacheKey,
  getUsersCache,
  invalidateUsersCache,
  setUsersCache,
} from '../services/usersCache';

type MainTab = 'submissions' | 'management' | 'audit';
type SubmissionTab = 'directory' | 'kpi';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [mainTab, setMainTab] = useState<MainTab>('submissions');
  const [submissionTab, setSubmissionTab] = useState<SubmissionTab>('directory');
  const [managementSubTab, setManagementSubTab] = useState<ManagementSubTab>('users');

  const [filters, setFilters] = useState<SubmissionFilters>(defaultFilters);
  const [directoryRecords, setDirectoryRecords] = useState<DirectoryRecord[]>([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [sortBy, setSortBy] = useState('lastSubmission');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [downloadMode, setDownloadMode] = useState<DirectoryDownloadMode>('normal');
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  const [users, setUsers] = useState<DBUser[]>([]);
  const [mobileNumberFilterOptions, setMobileNumberFilterOptions] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userMgmtFilters, setUserMgmtFilters] = useState<UserManagementFilters>(defaultUserManagementFilters);

  const [auditRecords, setAuditRecords] = useState<AuditSummaryRecord[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(defaultAuditFilters);

  const [dashboardData, setDashboardData] = useState<UnifiedDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = useCallback(async () => {
    setLoadingDirectory(true);
    setError(null);
    try {
      const res = await api.get('/api/internal/submissions/directory', {
        params: buildFilterParams(filters, { page: directoryPage, limit: 20, sortBy, sortDir }),
      });
      const data = res.data.data ?? res.data;
      setDirectoryRecords(data.records || []);
      setDirectoryTotal(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch directory');
    } finally {
      setLoadingDirectory(false);
    }
  }, [filters, directoryPage, sortBy, sortDir]);

  const fetchUsers = useCallback(async (force = false) => {
    const cacheKey = buildUsersCacheKey(userMgmtFilters);

    if (!force) {
      const cached = getUsersCache(cacheKey);
      if (cached) {
        console.log('Users cache HIT', cacheKey);
        setUsers(cached.users);
        setMobileNumberFilterOptions(cached.mobileNumbers);
        return;
      }
      console.log('Users cache MISS', cacheKey);
    } else {
      invalidateUsersCache();
      console.log('Users cache MISS', cacheKey);
    }

    console.log('Users API FETCH', cacheKey);
    setLoadingUsers(true);
    try {
      const res = await api.get('/api/internal/users', { params: buildUserMgmtParams(userMgmtFilters) });
      const data = res.data.data ?? res.data;
      let nextUsers: DBUser[] = [];
      let nextMobileNumbers: string[] = [];

      if (Array.isArray(data)) {
        nextUsers = data;
        nextMobileNumbers = data.map((user: DBUser) => user.mobileNumber);
      } else {
        nextUsers = data.users || [];
        nextMobileNumbers = data.filterOptions?.mobileNumbers || [];
      }

      setUsers(nextUsers);
      setMobileNumberFilterOptions(nextMobileNumbers);
      setUsersCache(cacheKey, { users: nextUsers, mobileNumbers: nextMobileNumbers });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  }, [userMgmtFilters]);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    setError(null);
    try {
      const res = await api.get('/api/internal/audit-logs', {
        params: buildAuditParams(auditFilters, { page: auditPage, limit: 20 }),
      });
      const data = res.data.data ?? res.data;
      setAuditRecords(data.records || []);
      setAuditTotal(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoadingAudit(false);
    }
  }, [auditFilters, auditPage]);

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const res = await api.get('/api/internal/dashboard', {
        params: buildFilterParams(filters),
      });
      setDashboardData(res.data.data ?? res.data);
    } catch (err: any) {
      setDashboardError(err.response?.data?.message || 'Failed to fetch dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  }, [filters]);

  const fetchSubmissionData = () => {
    if (submissionTab === 'kpi') {
      fetchDashboard();
    } else {
      fetchDirectory();
    }
  };

  const clearSubmissionFilters = () => {
    setFilters(defaultFilters);
    setDirectoryPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  useEffect(() => {
    if (mainTab === 'submissions' && submissionTab === 'directory') {
      fetchDirectory();
    } else if (mainTab === 'audit') {
      fetchAuditLogs();
    }
  }, [mainTab, submissionTab]);

  useEffect(() => {
    if (mainTab !== 'management' || managementSubTab !== 'users') return;
    const timer = setTimeout(() => { void fetchUsers(); }, 300);
    return () => clearTimeout(timer);
  }, [userMgmtFilters, mainTab, managementSubTab, fetchUsers]);

  useEffect(() => {
    if (mainTab === 'submissions' && submissionTab === 'directory') {
      fetchDirectory();
    }
  }, [directoryPage, sortBy, sortDir]);

  useEffect(() => {
    if (mainTab !== 'submissions' || submissionTab !== 'kpi') return;
    const timer = setTimeout(() => fetchDashboard(), 300);
    return () => clearTimeout(timer);
  }, [mainTab, submissionTab, filters, fetchDashboard]);

  useEffect(() => {
    if (mainTab === 'audit') fetchAuditLogs();
  }, [auditPage]);

  return (
    <AdminLayout
      mainTab={mainTab}
      submissionTab={submissionTab}
      onMainTabChange={setMainTab}
      onSubmissionTabChange={setSubmissionTab}
      isAdmin={isAdmin}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {mainTab === 'submissions' && (
        <div className="space-y-6">
          {submissionTab === 'directory' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Logs</h2>
              <p className="text-sm text-slate-500 mb-4">VCP profile submissions from salespersons only</p>
            </div>
          )}

          <SubmissionFiltersBar
            mode={submissionTab === 'kpi' ? 'dashboard' : 'logs'}
            filters={filters}
            setFilters={setFilters}
            loading={submissionTab === 'kpi' ? loadingDashboard : loadingDirectory}
            downloadMode={downloadMode}
            onDownloadModeChange={setDownloadMode}
            onClear={clearSubmissionFilters}
            onFetch={fetchSubmissionData}
            onExportCsv={() => downloadExport(
              '/api/internal/submissions/export-csv',
              'user-directory.csv',
              buildFilterParams(filters, { sortBy, sortDir, downloadMode })
            )}
            onExportExcel={() => downloadExport(
              '/api/internal/submissions/export-excel',
              'user-directory.xls',
              buildFilterParams(filters, { sortBy, sortDir, downloadMode })
            )}
          />

          {submissionTab === 'directory' ? (
            <UserDirectoryTab
              filters={filters}
              records={directoryRecords}
              total={directoryTotal}
              loading={loadingDirectory}
              sortBy={sortBy}
              sortDir={sortDir}
              page={directoryPage}
              onSort={handleSort}
              onPageChange={setDirectoryPage}
            />
          ) : (
            <AnalyticsDashboardTab
              data={dashboardData}
              loading={loadingDashboard}
              error={dashboardError}
              onRefresh={fetchDashboard}
            />
          )}
        </div>
      )}

      {isAdmin && mainTab === 'management' && (
        <ManagementTab
          subTab={managementSubTab}
          onSubTabChange={setManagementSubTab}
          users={users}
          mobileNumberOptions={mobileNumberFilterOptions}
          loadingUsers={loadingUsers}
          userMgmtFilters={userMgmtFilters}
          onUserMgmtFiltersChange={setUserMgmtFilters}
          currentUserId={user?.id}
          onRefreshUsers={() => { void fetchUsers(true); }}
          onExportUsersCsv={() => downloadExport('/api/internal/users/export-csv', 'users.csv', buildUserMgmtParams(userMgmtFilters))}
          onExportUsersExcel={() => downloadExport('/api/internal/users/export-excel', 'users.xls', buildUserMgmtParams(userMgmtFilters))}
          setError={setError}
        />
      )}

      {mainTab === 'audit' && (
        <AuditLogsTab
          records={auditRecords}
          total={auditTotal}
          loading={loadingAudit}
          filters={auditFilters}
          setFilters={setAuditFilters}
          page={auditPage}
          onPageChange={setAuditPage}
          onFetch={fetchAuditLogs}
          onExportCsv={() => downloadExport('/api/internal/audit-logs/export-csv', 'audit-activity-summary.csv', buildAuditParams(auditFilters))}
          onExportExcel={() => downloadExport('/api/internal/audit-logs/export-excel', 'audit-activity-summary.xls', buildAuditParams(auditFilters))}
        />
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
