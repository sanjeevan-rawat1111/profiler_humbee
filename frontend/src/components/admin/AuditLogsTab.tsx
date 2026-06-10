import React from 'react';
import { FilterX, FileDown, FileSpreadsheet } from 'lucide-react';
import type { AuditLogRecord } from '../../types/admin';
import { formatDateTime } from '../../utils/adminApi';

interface AuditFilters {
  user: string;
  region: string;
  eventType: string;
  status: string;
  fromDate: string;
  toDate: string;
}

interface Props {
  logs: AuditLogRecord[];
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
  logs, total, loading, filters, setFilters, page, onPageChange, onFetch, onExportCsv, onExportExcel,
}) => {
  const update = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Login/Logout Logs</h2>
        <p className="text-sm text-slate-500">Audit trail of authentication events</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Mobile Number"
            value={filters.user}
            onChange={(e) => update('user', e.target.value)}
            className="input-style-compact"
          />
          <input
            type="text"
            placeholder="Region"
            value={filters.region}
            onChange={(e) => update('region', e.target.value)}
            className="input-style-compact"
          />
          <select value={filters.eventType} onChange={(e) => update('eventType', e.target.value)} className="input-style-compact">
            <option value="">All Event Types</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
          </select>
          <select value={filters.status} onChange={(e) => update('status', e.target.value)} className="input-style-compact">
            <option value="">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAIL">FAIL</option>
          </select>
          <input type="date" value={filters.fromDate} onChange={(e) => update('fromDate', e.target.value)} className="input-style-compact" />
          <input type="date" value={filters.toDate} onChange={(e) => update('toDate', e.target.value)} className="input-style-compact" />
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <button
            onClick={() => setFilters({ user: '', region: '', eventType: '', status: '', fromDate: '', toDate: '' })}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FilterX className="w-3.5 h-3.5" /> Clear Filters
          </button>
          <div className="flex gap-2">
            <button onClick={onFetch} className="px-3.5 py-2 bg-humbee-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Fetch Logs</button>
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
          <span className="text-xs text-slate-400">{total} records found</span>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="p-4 text-left">Mobile Number</th>
                <th className="p-4 text-left">Region</th>
                <th className="p-4 text-left">Timestamp</th>
                <th className="p-4 text-left">Event Type</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-4 font-bold text-slate-800">{log.user}</td>
                  <td className="p-4 text-slate-600">{log.region || '—'}</td>
                  <td className="p-4">{formatDateTime(log.timestamp)}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded bg-slate-100 font-semibold">{log.eventType}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded font-semibold ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{log.reason || '—'}</td>
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
    </div>
  );
};

export default AuditLogsTab;
