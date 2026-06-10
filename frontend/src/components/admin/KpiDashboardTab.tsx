import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { RefreshCw, Trophy, Calendar, Users, TrendingUp, Clock, Activity } from 'lucide-react';
import type { KpiDashboardData } from '../../types/admin';
import { formatDateTime } from '../../utils/adminApi';

const COLORS = ['#349688', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

interface Props {
  data: KpiDashboardData | null;
  loading: boolean;
  rankingSort: 'asc' | 'desc';
  onRankingSortChange: (sort: 'asc' | 'desc') => void;
  onRefresh: () => void;
}

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; accent?: string }> = ({
  icon, label, value, accent = 'bg-humbee-50 text-humbee-700',
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${accent}`}>{icon}</div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="text-xl font-bold text-slate-800 mt-1">{value}</div>
  </div>
);

const KpiDashboardTab: React.FC<Props> = ({ data, loading, rankingSort, onRankingSortChange, onRefresh }) => {
  if (!data && loading) {
    return <div className="p-12 flex justify-center"><div className="spinner" /></div>;
  }
  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">KPI Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time submission analytics and user performance insights</p>
          <p className="text-xs text-slate-400 mt-1">Last Updated: {formatDateTime(data.lastUpdated)}</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={<Trophy className="w-4 h-4" />}
          label="Top Performer"
          value={summary.topPerformer ? `${summary.topPerformer.mobileNumber} (${summary.topPerformer.uniqueCount})` : '—'}
          accent="bg-amber-50 text-amber-700"
        />
        <KpiCard icon={<Calendar className="w-4 h-4" />} label="Today's Submissions" value={summary.todaysSubmissions} />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Total Submissions" value={summary.totalSubmissions} />
        <KpiCard icon={<Users className="w-4 h-4" />} label="Active Users" value={summary.activeUsers} accent="bg-blue-50 text-blue-700" />
        <KpiCard icon={<Activity className="w-4 h-4" />} label="Avg Submissions / Day" value={summary.avgSubmissionsPerDay} accent="bg-violet-50 text-violet-700" />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label="Last Activity"
          value={summary.lastActivity ? formatDateTime(summary.lastActivity) : '—'}
          accent="bg-slate-100 text-slate-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-800">User Performance Distribution</h3>
          <select
            value={rankingSort}
            onChange={(e) => onRankingSortChange(e.target.value as 'asc' | 'desc')}
            className="input-style-compact w-40"
          >
            <option value="desc">Most → Least</option>
            <option value="asc">Least → Most</option>
          </select>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.userPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mobileNumber" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="uniqueCount" fill="#349688" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.userPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mobileNumber" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="uniqueCount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Unique Submission Trend</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="uniqueCount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="uniqueCount" stroke="#349688" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">User Contribution Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.contribution} dataKey="uniqueCount" nameKey="mobileNumber" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {data.contribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Submission Activity Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="uniqueCount" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Top Performing Users</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="p-4 text-left">Rank</th>
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Unique Submissions</th>
              <th className="p-4 text-left">First Submission</th>
              <th className="p-4 text-left">Last Submission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.topPerformingUsers.map((row) => (
              <tr key={row.mobileNumber}>
                <td className="p-4 font-bold text-slate-400">#{row.rank}</td>
                <td className="p-4 font-mono font-bold text-slate-800">{row.mobileNumber}</td>
                <td className="p-4 font-mono text-humbee-700">{row.uniqueSubmissions}</td>
                <td className="p-4 text-slate-400">{row.firstSubmission ? formatDateTime(row.firstSubmission) : '—'}</td>
                <td className="p-4 text-amber-700">{row.lastSubmission ? formatDateTime(row.lastSubmission) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Recent Submission Activity</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="p-4 text-left">Timestamp</th>
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">SAP Code</th>
              <th className="p-4 text-left">VCP Mobile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.recentActivity.map((row, i) => (
              <tr key={`${row.timestamp}-${i}`}>
                <td className="p-4">{formatDateTime(row.timestamp)}</td>
                <td className="p-4 font-mono font-semibold">{row.userMobileNumber}</td>
                <td className="p-4 font-mono text-humbee-600">{row.sapCode}</td>
                <td className="p-4 font-mono">{row.customerMobileNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KpiDashboardTab;
