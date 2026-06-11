import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AlertCircle } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import SubmissionFiltersBar from '../components/admin/SubmissionFilters';
import UserDirectoryTab from '../components/admin/UserDirectoryTab';
import AnalyticsDashboardTab from '../components/admin/AnalyticsDashboardTab';
import AuditLogsTab from '../components/admin/AuditLogsTab';
import UserManagementTab from '../components/admin/UserManagementTab';
import { defaultAuditFilters, defaultFilters, defaultUserManagementFilters } from '../types/admin';
import type {
  AuditSummaryRecord,
  DirectoryDownloadMode,
  SubmissionFilters,
  DirectoryRecord,
  DBUser,
  UserManagementFilters,
  AuditFilters,
} from '../types/admin';
import { EXCLUDED_ANALYTICS_USERS } from '../constants/excludedAnalyticsUsers';
import { buildAuditParams, buildFilterParams, buildUserMgmtParams, downloadExport } from '../utils/adminApi';

type MainTab = 'submissions' | 'users' | 'audit';
type SubmissionTab = 'directory' | 'kpi';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>('submissions');
  const [submissionTab, setSubmissionTab] = useState<SubmissionTab>('directory');

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

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/api/internal/users', { params: buildUserMgmtParams(userMgmtFilters) });
      const data = res.data.data ?? res.data;
      if (Array.isArray(data)) {
        setUsers(data);
        setMobileNumberFilterOptions(data.map((user: DBUser) => user.mobileNumber));
      } else {
        setUsers(data.users || []);
        setMobileNumberFilterOptions(data.filterOptions?.mobileNumbers || []);
      }
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

  const fetchSubmissionData = () => {
    fetchDirectory();
  };

  const clearFilters = () => {
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
    if (mainTab === 'submissions') {
      fetchSubmissionData();
    } else if (mainTab === 'audit') {
      fetchAuditLogs();
    }
  }, [mainTab]);

  useEffect(() => {
    if (mainTab !== 'users') return;
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [userMgmtFilters, mainTab, fetchUsers]);
  useEffect(() => {
    if (mainTab === 'submissions' && submissionTab === 'directory') {
      fetchDirectory();
    }
  }, [directoryPage, sortBy, sortDir]);

  useEffect(() => {
    if (mainTab === 'audit') fetchAuditLogs();
  }, [auditPage]);

  const excludedAnalytics = new Set(EXCLUDED_ANALYTICS_USERS);
  const userOptions = users
    .filter((u) => u.role === 'user' && !excludedAnalytics.has(u.mobileNumber))
    .map((u) => ({ name: u.name, mobileNumber: u.mobileNumber }));

  return (
    <AdminLayout
      mainTab={mainTab}
      submissionTab={submissionTab}
      onMainTabChange={setMainTab}
      onSubmissionTabChange={setSubmissionTab}
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
              <h2 className="text-2xl font-bold text-slate-800">User Directory</h2>
              <p className="text-sm text-slate-500 mb-4">Search, filter and export user submissions</p>
            </div>
          )}

          {submissionTab === 'directory' && (
            <SubmissionFiltersBar
              filters={filters}
              setFilters={setFilters}
              users={userOptions}
              loading={loadingDirectory}
              downloadMode={downloadMode}
              onDownloadModeChange={setDownloadMode}
              onClear={clearFilters}
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
          )}

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
            <AnalyticsDashboardTab />
          )}
        </div>
      )}

      {mainTab === 'users' && (
        <UserManagementTab
          users={users}
          mobileNumberOptions={mobileNumberFilterOptions}
          loading={loadingUsers}
          filters={userMgmtFilters}
          onFiltersChange={setUserMgmtFilters}
          currentUserId={user?.id}
          onRefresh={fetchUsers}
          onExportCsv={() => downloadExport('/api/internal/users/export-csv', 'users.csv', buildUserMgmtParams(userMgmtFilters))}
          onExportExcel={() => downloadExport('/api/internal/users/export-excel', 'users.xls', buildUserMgmtParams(userMgmtFilters))}
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
