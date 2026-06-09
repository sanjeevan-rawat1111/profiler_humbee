import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCount } from '../../utils/adminApi';

export type SortOrder = 'desc' | 'asc';

interface ScrollableBarChartProps {
  data: { label: string; value: number }[];
  valueKey?: string;
  labelKey?: string;
  color?: string;
  visibleCount?: number;
  defaultSort?: SortOrder;
}

const BAR_HEIGHT = 36;

const ScrollableBarChart: React.FC<ScrollableBarChartProps> = ({
  data,
  color = '#349688',
  visibleCount = 10,
  defaultSort = 'desc',
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSort);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) =>
      sortOrder === 'desc' ? b.value - a.value : a.value - b.value
    );
    return sorted.map((item) => ({ name: item.label, value: formatCount(item.value) }));
  }, [data, sortOrder]);

  const viewportHeight = visibleCount * BAR_HEIGHT;
  const chartHeight = Math.max(viewportHeight, chartData.length * BAR_HEIGHT);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="input-style-compact w-44 text-xs"
        >
          <option value="desc">Highest to Lowest</option>
          <option value="asc">Lowest to Highest</option>
        </select>
      </div>
      <div className="overflow-y-auto rounded-xl border border-slate-100" style={{ maxHeight: viewportHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              allowDecimals={false}
              tickFormatter={(v) => formatCount(v).toString()}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={96} />
            <Tooltip
              formatter={(value) => [formatCount(value as number), 'Submissions']}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chartData.length > visibleCount && (
        <p className="text-[10px] text-slate-400 text-right">Scroll to view all {chartData.length} entries</p>
      )}
    </div>
  );
};

export default ScrollableBarChart;
