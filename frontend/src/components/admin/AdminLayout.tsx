import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, Shield, LogOut, LayoutDashboard, List } from 'lucide-react';

type MainTab = 'submissions' | 'users' | 'audit';
type SubmissionTab = 'directory' | 'kpi';

interface AdminLayoutProps {
  mainTab: MainTab;
  submissionTab: SubmissionTab;
  onMainTabChange: (tab: MainTab) => void;
  onSubmissionTabChange: (tab: SubmissionTab) => void;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  mainTab,
  submissionTab,
  onMainTabChange,
  onSubmissionTabChange,
  children,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="h-screen bg-[#f4f6f9] flex font-sans overflow-hidden">
      <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-6 border-b border-slate-100 shrink-0">
          <img src="/logo.svg" alt="Humbee" className="h-8 object-contain mb-2" />
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => onMainTabChange('submissions')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mainTab === 'submissions' ? 'bg-amber-50 text-amber-900 border-l-4 border-amber-500' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Submission Logs
          </button>

          {mainTab === 'submissions' && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => onSubmissionTabChange('directory')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  submissionTab === 'directory' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                User Directory
              </button>
              <button
                onClick={() => onSubmissionTabChange('kpi')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  submissionTab === 'kpi' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                KPI Dashboard
              </button>
            </div>
          )}

          <button
            onClick={() => onMainTabChange('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mainTab === 'users' ? 'bg-amber-50 text-amber-900 border-l-4 border-amber-500' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>

          <button
            onClick={() => onMainTabChange('audit')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mainTab === 'audit' ? 'bg-amber-50 text-amber-900 border-l-4 border-amber-500' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            Login/Logout Logs
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
          <div className="text-xs font-bold text-slate-700 capitalize mb-1">{user?.username}</div>
          <div className="text-[10px] text-slate-400 uppercase mb-3">{user?.role}</div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
