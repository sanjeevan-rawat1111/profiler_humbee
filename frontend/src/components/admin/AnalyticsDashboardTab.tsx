import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RefreshCw, TrendingUp, Users, MapPin, UserX } from 'lucide-react';
import type { UnifiedDashboardData } from '../../types/admin';
import RankedListPanel from './RankedListPanel';
import { formatCount, formatDateTime } from '../../utils/adminApi';

const COLORS = ['#349688', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#10b981', '#f97316'];

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

const ContributionPieChart: React.FC<{
  data: { uniqueCount: number; percentage: number; label: string }[];
  nameKey: string;
}> = ({ data, nameKey }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        dataKey="uniqueCount"
        nameKey={nameKey}
        cx="50%"
        cy="50%"
        innerRadius={55}
        outerRadius={90}
        paddingAngle={2}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip
        formatter={(value, _name, props) => [
          `${formatCount(value)} (${formatCount((props?.payload as { percentage?: number })?.percentage)}%)`,
          (props?.payload as Record<string, string>)?.[nameKey] ?? '',
        ]}
      />
      <Legend wrapperStyle={{ fontSize: 10 }} />
    </PieChart>
  </ResponsiveContainer>
);

interface Props {
  data: UnifiedDashboardData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const AnalyticsDashboardTab: React.FC<Props> = ({
  data,
  loading,
  error,
  onRefresh,
}) => {
  const regionListItems = useMemo(
    () => (data?.regions.totalChart ?? []).map((item) => ({ name: item.region, count: item.uniqueCount })),
    [data],
  );

  const stateListItems = useMemo(
    () => (data?.states.totalChart ?? []).map((item) => ({ name: item.state, count: item.uniqueCount })),
    [data],
  );

  const regionPieData = useMemo(
    () => (data?.regions.contribution ?? []).map((item) => ({
      region: item.region,
      uniqueCount: item.uniqueCount,
      percentage: item.percentage,
      label: item.region,
    })),
    [data],
  );

  const districtListItems = useMemo(
    () => (data?.districts.totalChart ?? []).map((item) => ({
      name: item.district,
      count: item.uniqueCount,
      state: item.state,
    })),
    [data],
  );

  const districtPieData = useMemo(
    () => (data?.districts.contribution ?? []).map((item) => ({
      label: item.label,
      uniqueCount: item.uniqueCount,
      percentage: item.percentage,
    })),
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

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-500">Submission analytics for the selected filters</p>
          {data?.lastUpdated && (
            <p className="text-xs text-slate-400 mt-1">Last updated: {formatDateTime(data.lastUpdated)}</p>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
            <SectionHeader title="Region Analytics" subtitle="Region-level performance and contribution" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <RankedListPanel
                title="Region-wise Total Submissions"
                items={regionListItems}
                nameLabel="Region"
                countLabel="Submissions"
              />
              <ChartPanel title="Region Contribution Distribution">
                {regionPieData.length > 0 ? (
                  <ContributionPieChart data={regionPieData} nameKey="region" />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No region data for selected filters
                  </div>
                )}
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
                {data.states.contribution.length > 0 ? (
                  <ContributionPieChart
                    data={data.states.contribution.map((item) => ({
                      state: item.state,
                      uniqueCount: item.uniqueCount,
                      percentage: item.percentage,
                      label: item.state,
                    }))}
                    nameKey="state"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No state data for selected filters
                  </div>
                )}
              </ChartPanel>
            </div>
          </section>

          <section>
            <SectionHeader title="District Analytics" subtitle="District-level performance and contribution" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <RankedListPanel
                title="District-wise Total Submissions"
                items={[]}
                extendedItems={districtListItems}
                nameLabel="District"
                countLabel="Submissions"
              />
              <ChartPanel title="District Contribution Distribution">
                {districtPieData.length > 0 ? (
                  <ContributionPieChart data={districtPieData} nameKey="label" />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No district data for selected filters
                  </div>
                )}
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
                {data.users.activityDistribution.length > 0 ? (
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
                          (props?.payload as { name?: string })?.name ?? '',
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No user data for selected filters
                  </div>
                )}
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
