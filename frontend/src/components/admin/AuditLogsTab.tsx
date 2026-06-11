import React, { useState } from 'react';
import { FilterX, FileDown, FileSpreadsheet, X } from 'lucide-react';
import api from '../../services/api';
import DatePeriodFilter from './DatePeriodFilter';
import RegionStateDistrictSelect from '../RegionStateDistrictSelect';
import type { AuditActivityDetail, AuditFilters, AuditSummaryRecord } from '../../types/admin';
import { defaultAuditFilters } from '../../types/admin';
import { buildAuditParams, formatDateTime } from '../../utils/adminApi';

interface Props {
  records: AuditSummaryRecord[];
  total: number;
  loading: boolean;
  filters: AuditFilters;
  setFilters: React.Dispatch<React.SetStateAction<AuditFilters>>;
  page: number;
  onPageChange: (page: number) => void;
  onFetch: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
}

const AuditLogsTab: React.FC<Props> = ({
  records,
  total,
  loading,
  filters,
  setFilters,
  page,
  onPageChange,
  onFetch,
  onExportCsv,
  onExportExcel,
}) => {
  const [selectedUser, setSelectedUser] = useState<AuditSummaryRecord | null>(null);
  const [detail, setDetail] = useState<AuditActivityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const update = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const openDetails = async (record: AuditSummaryRecord) => {
    setSelectedUser(record);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/internal/audit-logs/${record.userMobile}/activity`, {
        params: buildAuditParams(filters),
      });
      setDetail(res.data.data ?? null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Login/Logout Activity</h2>
        <p className="text-sm text-slate-500">Track authentication activity by user</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <DatePeriodFilter
          value={{ period: filters.period, fromDate: filters.fromDate, toDate: filters.toDate }}
          onChange={(value) => setFilters((prev) => ({ ...prev, ...value }))}
          name="auditPeriod"
        />

        <input
          type="text"
          placeholder="Search by name, user mobile, state, district, event type..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="input-style-compact w-full"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={filters.name}
            onChange={(e) => update('name', e.target.value)}
            className="input-style-compact"
          />
          <input
            type="text"
            placeholder="User Mobile"
            value={filters.user}
            onChange={(e) => update('user', e.target.value)}
            className="input-style-compact"
          />
          <select value={filters.eventType} onChange={(e) => update('eventType', e.target.value)} className="input-style-compact">
            <option value="">All Event Types</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
          </select>
        </div>

        <RegionStateDistrictSelect
          regionId={filters.regionId}
          stateId={filters.stateId}
          districtId={filters.districtId}
          onChange={(regionId, stateId, districtId) => setFilters((prev) => ({ ...prev, regionId, stateId, districtId }))}
        />

        <div className="flex flex-wrap justify-between gap-2">
          <button
            onClick={() => setFilters(defaultAuditFilters)}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FilterX className="w-3.5 h-3.5" /> Clear Filters
          </button>
          <div className="flex gap-2">
            <button onClick={onFetch} className="px-3.5 py-2 bg-humbee-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Fetch Activity</button>
            <button onClick={onExportCsv} className="px-3.5 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <FileDown className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={onExportExcel} className="px-3.5 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between">
          <h3 className="text-sm font-bold text-slate-700">Audit Records</h3>
          <span className="text-xs text-slate-400">{total} users found</span>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">User Mobile</th>
                <th className="p-4 text-left">State</th>
                <th className="p-4 text-left">District</th>
                <th className="p-4 text-left">First Activity</th>
                <th className="p-4 text-left">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr
                  key={record.userMobile}
                  onClick={() => openDetails(record)}
                  className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                >
                  <td className="p-4 font-bold text-slate-800">{record.name || '—'}</td>
                  <td className="p-4 font-mono text-slate-700">{record.userMobile}</td>
                  <td className="p-4 text-slate-600">{record.state || '—'}</td>
                  <td className="p-4 text-slate-600">{record.district || '—'}</td>
                  <td className="p-4 text-slate-400">{record.firstActivity ? formatDateTime(record.firstActivity) : '—'}</td>
                  <td className="p-4 text-amber-700 font-semibold">{record.lastActivity ? formatDateTime(record.lastActivity) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 20 && (
          <div className="px-6 py-3 border-t flex justify-end gap-2">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 border rounded-lg text-xs cursor-pointer disabled:opacity-40">Previous</button>
            <span className="text-xs self-center">Page {page}</span>
            <button disabled={page * 20 >= total} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 border rounded-lg text-xs cursor-pointer disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => { setSelectedUser(null); setDetail(null); }}>
          <div className="w-full max-w-lg h-full bg-white shadow-2xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">User Activity Details</h3>
                <p className="text-sm text-slate-500">
                  Name: <span className="font-semibold text-slate-800">{selectedUser.name || detail?.name || '—'}</span>
                </p>
                <p className="text-sm text-slate-500">
                  User Mobile: <span className="font-mono font-semibold text-slate-700">{selectedUser.userMobile}</span>
                </p>
                <p className="text-sm text-slate-500">
                  State: <span className="font-semibold text-slate-700">{selectedUser.state || '—'}</span>
                  {' · '}
                  District: <span className="font-semibold text-slate-700">{selectedUser.district || '—'}</span>
                </p>
              </div>
              <button onClick={() => { setSelectedUser(null); setDetail(null); }} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-12"><div className="spinner" /></div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b">
                    <th className="p-2 text-left">Event Type</th>
                    <th className="p-2 text-left">Timestamp</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(detail?.activities ?? []).map((activity) => (
                    <tr key={activity.id}>
                      <td className="p-2 font-semibold">{activity.eventType}</td>
                      <td className="p-2">{formatDateTime(activity.timestamp)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded font-semibold ${activity.status === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {activity.status}
                        </span>
                      </td>
                      <td className="p-2 text-slate-500">{activity.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsTab;
