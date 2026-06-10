import React from 'react';
import { Search, FilterX, RefreshCw, FileSpreadsheet, FileDown } from 'lucide-react';
import type { SubmissionFilters as Filters } from '../../types/admin';

interface Props {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  users: string[];
  loading?: boolean;
  showPeriod?: boolean;
  onClear: () => void;
  onFetch: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
}

const SubmissionFiltersBar: React.FC<Props> = ({
  filters,
  setFilters,
  users,
  loading,
  showPeriod,
  onClear,
  onFetch,
  onExportCsv,
  onExportExcel,
}) => {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
      <div className="input-wrapper">
        <Search className="input-wrapper-icon w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by mobile number, region, SAP code..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="input-style-compact"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <select
          value={filters.user}
          onChange={(e) => update('user', e.target.value)}
          className="input-style-compact"
        >
          <option value="">All Users</option>
          {users.map((mobile) => (
            <option key={mobile} value={mobile}>{mobile}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Region"
          value={filters.region}
          onChange={(e) => update('region', e.target.value)}
          className="input-style-compact"
        />
        <input
          type="text"
          placeholder="SAP Code"
          value={filters.sapCode}
          onChange={(e) => update('sapCode', e.target.value)}
          className="input-style-compact"
        />
        <input
          type="text"
          placeholder="Mobile Number"
          value={filters.mobileNumber}
          onChange={(e) => update('mobileNumber', e.target.value)}
          className="input-style-compact"
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 px-1">
          <input
            type="checkbox"
            checked={filters.singleDay}
            onChange={(e) => update('singleDay', e.target.checked)}
            className="rounded border-slate-300"
          />
          Single Day Search
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filters.singleDay ? (
          <input
            type="date"
            value={filters.date}
            onChange={(e) => update('date', e.target.value)}
            className="input-style-compact"
          />
        ) : (
          <>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => update('fromDate', e.target.value)}
              className="input-style-compact"
              placeholder="From Date"
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => update('toDate', e.target.value)}
              className="input-style-compact"
              placeholder="To Date"
            />
          </>
        )}

        {showPeriod && (
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { value: 'today', label: 'Today' },
              { value: '7', label: '7 Days' },
              { value: '30', label: '30 Days' },
              { value: 'custom', label: 'Custom' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  type="radio"
                  name="kpiPeriod"
                  checked={filters.period === opt.value}
                  onChange={() => update('period', opt.value as Filters['period'])}
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <button
          onClick={onClear}
          className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <FilterX className="w-3.5 h-3.5" />
          Clear Filters
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onFetch}
            className="px-3.5 py-2 bg-humbee-500 hover:bg-humbee-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Fetch Submissions
          </button>
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="px-3.5 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3.5 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionFiltersBar;
