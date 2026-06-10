import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import api from '../../services/api';
import type { DirectoryRecord, SubmissionDetail, SubmissionFilters } from '../../types/admin';
import { buildFilterParams, formatDateTime } from '../../utils/adminApi';

interface Props {
  filters: SubmissionFilters;
  records: DirectoryRecord[];
  total: number;
  loading: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  page: number;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
}

const sortableColumns = [
  { key: 'userMobileNumber', label: 'User' },
  { key: 'region', label: 'Region' },
  { key: 'sapCode', label: 'SAP Code' },
  { key: 'mobileNumber', label: 'VCP Mobile' },
  { key: 'submissionCount', label: 'Submission Count' },
  { key: 'firstSubmission', label: 'First Submission' },
  { key: 'lastSubmission', label: 'Last Submission' },
];

const UserDirectoryTab: React.FC<Props> = ({
  filters,
  records,
  total,
  loading,
  sortBy,
  sortDir,
  page,
  onSort,
  onPageChange,
}) => {
  const [selectedUser, setSelectedUser] = useState<DirectoryRecord | null>(null);
  const [details, setDetails] = useState<SubmissionDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const openDetails = async (record: DirectoryRecord) => {
    setSelectedUser(record);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/internal/submissions/directory/${record.userId}`, {
        params: buildFilterParams(filters),
      });
      setDetails(res.data.data ?? []);
    } finally {
      setLoadingDetails(false);
    }
  };

  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />
    ) : null
  );

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-700">Registered Users</h3>
          <span className="text-xs font-semibold text-slate-400">{total} records found</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  {sortableColumns.map((col) => (
                    <th key={col.key} className="p-4 cursor-pointer select-none" onClick={() => onSort(col.key)}>
                      {col.label} <SortIcon field={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {records.map((record) => (
                  <tr
                    key={record.userId}
                    onClick={() => openDetails(record)}
                    className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-mono font-bold text-slate-800">{record.userMobileNumber}</td>
                    <td className="p-4 text-slate-600">{record.region}</td>
                    <td className="p-4 font-mono text-humbee-600">{record.sapCode}</td>
                    <td className="p-4 font-mono">{record.mobileNumber}</td>
                    <td className="p-4 font-bold">{record.submissionCount}</td>
                    <td className="p-4 text-slate-400">{formatDateTime(record.firstSubmission)}</td>
                    <td className="p-4 text-amber-700 font-semibold">{formatDateTime(record.lastSubmission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 self-center">Page {page}</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-lg h-full bg-white shadow-2xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Submission Details</h3>
                <p className="text-sm text-slate-500">User: <span className="font-mono font-semibold text-slate-700">{selectedUser.userMobileNumber}</span></p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {loadingDetails ? (
              <div className="flex justify-center py-12"><div className="spinner" /></div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b">
                    <th className="p-2 text-left">SAP Code</th>
                    <th className="p-2 text-left">VCP Mobile</th>
                    <th className="p-2 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2 font-mono text-humbee-600">{d.sapCode}</td>
                      <td className="p-2 font-mono">{d.mobileNumber}</td>
                      <td className="p-2">{formatDateTime(d.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UserDirectoryTab;
