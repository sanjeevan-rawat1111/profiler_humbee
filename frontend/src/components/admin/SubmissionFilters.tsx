import React from 'react';
import { Search, FilterX, RefreshCw, FileSpreadsheet, FileDown } from 'lucide-react';
import DatePeriodFilter from './DatePeriodFilter';
import RegionStateDistrictSelect from '../RegionStateDistrictSelect';
import type { DirectoryDownloadMode, SubmissionFilters as Filters } from '../../types/admin';

interface Props {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  users: { name: string; mobileNumber: string }[];
  loading?: boolean;
  downloadMode?: DirectoryDownloadMode;
  onDownloadModeChange?: (mode: DirectoryDownloadMode) => void;
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
  downloadMode = 'normal',
  onDownloadModeChange,
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
      <DatePeriodFilter
        value={{ period: filters.period, fromDate: filters.fromDate, toDate: filters.toDate }}
        onChange={(value) => setFilters((prev) => ({ ...prev, ...value }))}
        name="directoryPeriod"
      />

      <div className="input-wrapper">
        <Search className="input-wrapper-icon w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, user mobile, VCP mobile, state, district, SAP code..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="input-style-compact"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <select
          value={filters.user}
          onChange={(e) => update('user', e.target.value)}
          className="input-style-compact"
          aria-label="Salesperson"
          title="Salesperson"
        >
          <option value="">All Salespersons</option>
          {users.map((officer) => (
            <option key={officer.mobileNumber} value={officer.mobileNumber}>{officer.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="SAP Code"
          value={filters.sapCode}
          onChange={(e) => update('sapCode', e.target.value)}
          className="input-style-compact"
        />
        <input
          type="text"
          placeholder="VCP Mobile"
          value={filters.mobileNumber}
          onChange={(e) => update('mobileNumber', e.target.value)}
          className="input-style-compact"
        />
      </div>

      <RegionStateDistrictSelect
        regionId={filters.regionId}
        stateId={filters.stateId}
        districtId={filters.districtId}
        onChange={(regionId, stateId, districtId) => setFilters((prev) => ({ ...prev, regionId, stateId, districtId }))}
      />

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <button
          onClick={onClear}
          className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <FilterX className="w-3.5 h-3.5" />
          Clear Filters
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {onDownloadModeChange && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden mr-1">
              <button
                type="button"
                onClick={() => onDownloadModeChange('normal')}
                className={`px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  downloadMode === 'normal'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Normal Download
              </button>
              <button
                type="button"
                onClick={() => onDownloadModeChange('master')}
                className={`px-3 py-2 text-xs font-semibold transition-colors cursor-pointer border-l border-slate-200 ${
                  downloadMode === 'master'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Master Download
              </button>
            </div>
          )}
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
