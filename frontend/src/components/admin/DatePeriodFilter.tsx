import React from 'react';
import type { DashboardPeriod } from '../../types/admin';

interface PeriodValue {
  period: DashboardPeriod;
  fromDate: string;
  toDate: string;
}

interface Props {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  name?: string;
}

const OPTIONS: { id: DashboardPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

const DatePeriodFilter: React.FC<Props> = ({ value, onChange, name = 'reportPeriod' }) => {
  const setPeriod = (period: DashboardPeriod) => {
    onChange({ ...value, period });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              value.period === option.id
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={value.period === option.id}
              onChange={() => setPeriod(option.id)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {value.period === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="date"
            value={value.fromDate}
            onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
            className="input-style-compact"
            aria-label="From date"
          />
          <input
            type="date"
            value={value.toDate}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
            className="input-style-compact"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
};

export default DatePeriodFilter;
