import React, { useMemo, useState } from 'react';
import { formatCount, formatDateTime } from '../../utils/adminApi';

export type SortOrder = 'desc' | 'asc';

interface RankedListPanelProps {
  title: string;
  items: { name: string; count: number }[];
  nameLabel?: string;
  countLabel?: string;
  defaultSort?: SortOrder;
  highlightTop?: boolean;
  showLastSubmission?: boolean;
  showLocationColumns?: boolean;
  extendedItems?: {
    name: string;
    count: number;
    state?: string;
    district?: string;
    lastSubmission?: string | null;
  }[];
}

const RankedListPanel: React.FC<RankedListPanelProps> = ({
  title,
  items,
  nameLabel = 'Name',
  countLabel = 'Submissions',
  defaultSort = 'desc',
  highlightTop = false,
  showLastSubmission = false,
  showLocationColumns = false,
  extendedItems,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSort);

  const rows = useMemo(() => {
    const source = extendedItems ?? items.map((item) => ({
      ...item,
      state: undefined,
      district: undefined,
      lastSubmission: undefined,
    }));
    const sorted = [...source].sort((a, b) => {
      if (showLastSubmission) {
        const aTime = a.lastSubmission ? new Date(a.lastSubmission).getTime() : 0;
        const bTime = b.lastSubmission ? new Date(b.lastSubmission).getTime() : 0;
        return aTime - bTime;
      }
      return sortOrder === 'desc' ? b.count - a.count : a.count - b.count;
    });
    return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [items, extendedItems, sortOrder, showLastSubmission]);

  const gridCols = showLocationColumns
    ? 'grid-cols-[48px_1fr_1fr_1fr_auto]'
    : 'grid-cols-[48px_1fr_auto]';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="mb-4 min-w-0">
        <h4 className="text-sm font-bold text-slate-800 leading-snug">{title}</h4>
        {!showLastSubmission && (
          <div className="flex justify-end mt-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label="Sort order"
              className="input-style-compact w-[4.75rem] text-xs"
            >
              <option value="desc">Most</option>
              <option value="asc">Least</option>
            </select>
          </div>
        )}
      </div>

      <div className={`grid gap-2 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 ${gridCols}`}>
        <span>Rank</span>
        <span>{nameLabel}</span>
        {showLocationColumns && <span>State</span>}
        {showLocationColumns && <span>District</span>}
        <span className="text-right">{showLastSubmission ? 'Last Submission' : countLabel}</span>
      </div>

      <div className="flex-1 max-h-80 overflow-y-auto mt-1">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No data for selected filters</p>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.name}-${row.rank}`}
              className={`grid gap-2 items-center px-2 py-2.5 border-b border-slate-50 text-xs ${gridCols} ${
                highlightTop && row.rank <= 3 ? 'bg-amber-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <span className="font-bold text-slate-400">#{row.rank}</span>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{row.name}</div>
                {!showLocationColumns && (row.state || row.district) && (
                  <div className="text-[10px] text-slate-400 truncate">
                    {[row.state, row.district].filter(Boolean).join(' / ')}
                  </div>
                )}
              </div>
              {showLocationColumns && (
                <span className="text-slate-600 truncate">{row.state || '—'}</span>
              )}
              {showLocationColumns && (
                <span className="text-slate-600 truncate">{row.district || '—'}</span>
              )}
              <span className={`text-right ${showLastSubmission ? 'text-slate-600' : 'font-mono text-humbee-700'}`}>
                {showLastSubmission
                  ? (row.lastSubmission ? formatDateTime(row.lastSubmission) : 'Never')
                  : formatCount(row.count)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RankedListPanel;
