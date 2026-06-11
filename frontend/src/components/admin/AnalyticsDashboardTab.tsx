import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RefreshCw, TrendingUp, Users, MapPin, UserX } from 'lucide-react';
import api from '../../services/api';
import SearchableMultiSelect from './SearchableMultiSelect';
import StateDistrictSelect from '../StateDistrictSelect';
import RankedListPanel from './RankedListPanel';
import ScrollableBarChart from './ScrollableBarChart';
import type { GlobalDashboardFilters, UnifiedDashboardData, DashboardPeriod } from '../../types/admin';
import { defaultGlobalDashboardFilters } from '../../types/admin';
import { buildDashboardParams, formatCount, formatDateTime } from '../../utils/adminApi';

const COLORS = ['#349688', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#10b981', '#f97316'];

const PERIOD_OPTIONS: { id: DashboardPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; accent?: string }> = ({
  icon, label, value, accent = 'bg-humbee-50 text-humbee-700',
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>{icon}</div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="text-2xl font-bold text-slate-800 mt-1">{formatCount(value)}</div>
  </div>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
  </div>
);

const ChartPanel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title, children, className = 'h-80',
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
    <h4 className="text-sm font-bold text-slate-800 mb-4">{title}</h4>
    <div className={className}>{children}</div>
  </div>
);

const AnalyticsDashboardTab: React.FC = () => {
  const [filters, setFilters] = useState<GlobalDashboardFilters>(defaultGlobalDashboardFilters);
  const [data, setData] = useState<UnifiedDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (activeFilters: GlobalDashboardFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/internal/dashboard', { params: buildDashboardParams(activeFilters) });
      setData(res.data.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchDashboard(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, fetchDashboard]);

  const availableUsers = useMemo(() => {
    if (!data) return [];
    const { users } = data.filterOptions;
    return users
      .filter((u) => {
        if (filters.stateId && u.stateId !== filters.stateId) return false;
        if (filters.districtId && u.districtId !== filters.districtId) return false;
        return true;
      })
      .map((u) => u.mobileNumber);
  }, [data, filters.stateId, filters.districtId]);

  useEffect(() => {
    if (!filters.users.length) return;
    const valid = new Set(availableUsers);
    const pruned = filters.users.filter((u) => valid.has(u));
    if (pruned.length !== filters.users.length) {
      setFilters((prev) => ({ ...prev, users: pruned }));
    }
  }, [availableUsers, filters.users]);

  const setPeriod = (period: DashboardPeriod) => {
    setFilters((prev) => ({
      ...prev,
      period,
      ...(period !== 'custom' ? { fromDate: '', toDate: '' } : {}),
    }));
  };

  const stateListItems = useMemo(
    () => (data?.states.totalChart ?? []).map((item) => ({ name: item.state, count: item.uniqueCount })),
    [data],
  );

  const userListItems = useMemo(
    () => (data?.users.topChart ?? []).map((item) => ({ name: item.name, count: item.uniqueCount })),
    [data],
  );

  const inactiveListItems = useMemo(
    () => (data?.inactiveUsers ?? []).map((item) => ({
      name: item.name,
      mobileNumber: item.mobileNumber,
      count: 0,
      state: item.state,
      district: item.district,
      lastSubmission: item.lastSubmission,
    })),
    [data],
  );

  const hasScopeFilters = filters.stateId || filters.districtId || filters.users.length > 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Executive Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time submission analytics across states, districts, and users</p>
          {data?.lastUpdated && (
            <p className="text-xs text-slate-400 mt-1">Last updated: {formatDateTime(data.lastUpdated)}</p>
          )}
        </div>
        <button
          onClick={() => fetchDashboard(filters)}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="sticky top-0 z-30 -mx-1 px-1 pt-1 pb-3 bg-[#f4f6f9]/95 backdrop-blur-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Period</span>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filters.period === opt.id
                    ? 'bg-humbee-600 text-white shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filters.period === 'custom' && (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                  className="input-style-compact"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                  className="input-style-compact"
                />
              </div>
            </div>
          )}

          <StateDistrictSelect
            stateId={filters.stateId}
            districtId={filters.districtId}
            onChange={(stateId, districtId) => setFilters((f) => ({ ...f, stateId, districtId }))}
          />

          <SearchableMultiSelect
            label="Mobile Number"
            placeholder="Search mobile number..."
            options={availableUsers}
            selected={filters.users}
            onChange={(users) => setFilters((f) => ({ ...f, users }))}
            disabled={!data && loading}
          />

          {hasScopeFilters && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold">Active filters:</span>
              {filters.stateId && <span>State selected</span>}
              {filters.districtId && <span>District selected</span>}
              {filters.users.length > 0 && <span>{filters.users.length} user(s)</span>}
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, stateId: '', districtId: '', users: [] }))}
                className="text-humbee-700 font-semibold hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-medium">{error}</div>
      )}

      {loading && !data ? (
        <div className="p-16 flex justify-center"><div className="spinner" /></div>
      ) : data && (
        <>
          <section>
            <SectionHeader title="Key Metrics" subtitle="Filtered by selected period and scope" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Total Submissions" value={data.summary.totalSubmissions} />
              <KpiCard icon={<Users className="w-5 h-5" />} label="Active Users" value={data.summary.activeUsers} accent="bg-blue-50 text-blue-700" />
              <KpiCard icon={<MapPin className="w-5 h-5" />} label="Active States" value={data.summary.activeStates} accent="bg-violet-50 text-violet-700" />
              <KpiCard icon={<UserX className="w-5 h-5" />} label="Inactive Users" value={data.summary.inactiveUsers} accent="bg-red-50 text-red-700" />
            </div>
          </section>

          <section>
            <SectionHeader title="Top Performers" subtitle="Rankings for the selected period and filters" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartPanel title="Top States Ranking" className="min-h-[420px]">
                <ScrollableBarChart
                  data={data.topPerformers.states.map((item) => ({
                    label: item.state,
                    value: item.totalSubmissions,
                  }))}
                  color="#3b82f6"
                />
              </ChartPanel>
              <ChartPanel title="Top Users Ranking" className="min-h-[420px]">
                <ScrollableBarChart
                  data={data.topPerformers.users.map((item) => ({
                    label: item.name,
                    value: item.totalSubmissions,
                  }))}
                  color="#8b5cf6"
                />
              </ChartPanel>
            </div>
          </section>

          <section>
            <SectionHeader title="State Analytics" subtitle="State-level performance and contribution" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <RankedListPanel
                title="State-wise Total Submissions"
                items={stateListItems}
                nameLabel="State"
                countLabel="Submissions"
              />
              <ChartPanel title="State Contribution Distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.states.contribution}
                      dataKey="uniqueCount"
                      nameKey="state"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {data.states.contribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${formatCount(value)} (${formatCount((props?.payload as { percentage?: number })?.percentage)}%)`,
                        (props?.payload as { state?: string })?.state ?? '',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </section>

          <section>
            <SectionHeader title="User Analytics" subtitle="Individual user performance and activity" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <RankedListPanel
                title="Top Users by Submission Count"
                items={userListItems}
                nameLabel="Name"
                countLabel="Submissions"
              />
              <ChartPanel title="User Activity Distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.users.activityDistribution.slice(0, 10)}
                      dataKey="uniqueCount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {data.users.activityDistribution.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${formatCount(value)} (${formatCount((props?.payload as { percentage?: number })?.percentage)}%)`,
                        (props?.payload as { name?: string; mobileNumber?: string })?.name ?? '',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </section>

          <section>
            <SectionHeader title="Inactive Users" subtitle="No submissions during the selected period — sorted by longest inactivity" />
            <RankedListPanel
              title="Inactive Users List"
              items={[]}
              extendedItems={inactiveListItems}
              nameLabel="Name"
              showLastSubmission
              showLocationColumns
              highlightTop
            />
          </section>
        </>
      )}

      {loading && data && (
        <div className="fixed bottom-6 right-6 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-lg text-xs font-semibold text-slate-600 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboardTab;
