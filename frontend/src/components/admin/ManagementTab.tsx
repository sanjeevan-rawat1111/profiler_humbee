import React from 'react';
import UserManagementTab from './UserManagementTab';
import RegionManagementTab from './RegionManagementTab';
import type { DBUser, UserManagementFilters } from '../../types/admin';

export type ManagementSubTab = 'users' | 'regions';

interface Props {
  subTab: ManagementSubTab;
  onSubTabChange: (tab: ManagementSubTab) => void;
  users: DBUser[];
  mobileNumberOptions: string[];
  loadingUsers: boolean;
  userMgmtFilters: UserManagementFilters;
  onUserMgmtFiltersChange: (filters: UserManagementFilters) => void;
  currentUserId?: string;
  onRefreshUsers: () => void;
  onExportUsersCsv: () => void;
  onExportUsersExcel: () => void;
  setError: (msg: string | null) => void;
}

const ManagementTab: React.FC<Props> = ({
  subTab,
  onSubTabChange,
  users,
  mobileNumberOptions,
  loadingUsers,
  userMgmtFilters,
  onUserMgmtFiltersChange,
  currentUserId,
  onRefreshUsers,
  onExportUsersCsv,
  onExportUsersExcel,
  setError,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Management</h2>
        <p className="text-sm text-slate-500">Manage users and business regions</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => onSubTabChange('users')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            subTab === 'users'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => onSubTabChange('regions')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            subTab === 'regions'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Regions
        </button>
      </div>

      {subTab === 'users' ? (
        <UserManagementTab
          users={users}
          mobileNumberOptions={mobileNumberOptions}
          loading={loadingUsers}
          filters={userMgmtFilters}
          onFiltersChange={onUserMgmtFiltersChange}
          currentUserId={currentUserId}
          onRefresh={onRefreshUsers}
          onExportCsv={onExportUsersCsv}
          onExportExcel={onExportUsersExcel}
          setError={setError}
        />
      ) : (
        <RegionManagementTab setError={setError} />
      )}
    </div>
  );
};

export default ManagementTab;
