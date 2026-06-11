import React, { useCallback } from 'react';
import { Search, FilterX, RefreshCw, FileSpreadsheet, FileDown } from 'lucide-react';
import DatePeriodFilter from './DatePeriodFilter';
import RegionStateDistrictSelect from '../RegionStateDistrictSelect';
import SearchableMultiSelect from './SearchableMultiSelect';
import type { DirectoryDownloadMode, SubmissionFilters as Filters } from '../../types/admin';
import { fetchFilterMobileOptions, fetchFilterNameOptions } from '../../utils/adminApi';

interface Props {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  mode?: 'logs' | 'dashboard';
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
  mode = 'logs',
  loading,
  downloadMode = 'normal',
  onDownloadModeChange,
  onClear,
  onFetch,
  onExportCsv,
  onExportExcel,
}) => {
  const isLogs = mode === 'logs';
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const loadNameOptions = useCallback(
    (query: string) => fetchFilterNameOptions(query, 'user'),
    [],
  );

  const loadUserMobileOptions = useCallback(
    (query: string) => fetchFilterMobileOptions(query, 'user'),
    [],
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
      <DatePeriodFilter
        value={{ period: filters.period, fromDate: filters.fromDate, toDate: filters.toDate }}
        onChange={(value) => setFilters((prev) => ({ ...prev, ...value }))}
        name="directoryPeriod"
      />

      {isLogs && (
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
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
        <SearchableMultiSelect
          label="Name"
          placeholder="Search name..."
          selected={filters.names}
          onChange={(names) => update('names', names)}
          loadOptions={loadNameOptions}
        />
        <SearchableMultiSelect
          label="User Mobile"
          placeholder="Search user mobile..."
          selected={filters.userMobiles}
          onChange={(userMobiles) => update('userMobiles', userMobiles)}
          loadOptions={loadUserMobileOptions}
        />
        <div className="min-w-[160px] flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            SAP Code
          </label>
          <input
            type="text"
            placeholder="SAP Code"
            value={filters.sapCode}
            onChange={(e) => update('sapCode', e.target.value)}
            className="input-style-compact w-full min-h-[42px] rounded-xl"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            VCP Mobile
          </label>
          <input
            type="text"
            placeholder="VCP Mobile"
            value={filters.mobileNumber}
            onChange={(e) => update('mobileNumber', e.target.value)}
            className="input-style-compact w-full min-h-[42px] rounded-xl"
          />
        </div>
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
          {isLogs && onDownloadModeChange && (
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
          {isLogs && (
            <button
              onClick={onFetch}
              className="px-3.5 py-2 bg-humbee-500 hover:bg-humbee-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Fetch Submissions
            </button>
          )}
          {isLogs && onExportCsv && (
            <button
              onClick={onExportCsv}
              className="px-3.5 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
          {isLogs && onExportExcel && (
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
