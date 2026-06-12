import React, { useCallback, useEffect, useState } from 'react';
import UserManagementTab from './UserManagementTab';
import RegionManagementTab from './RegionManagementTab';
import {
  loadManagementGeoCatalog,
  peekManagementGeoCatalog,
} from '../../services/geoCatalog';
import type { DBUser, UserManagementFilters } from '../../types/admin';
import type { GeoRegion, GeoState } from '../../types/geo';

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
  const initialCatalog = peekManagementGeoCatalog();
  const [catalogRegions, setCatalogRegions] = useState<GeoRegion[]>(initialCatalog?.regions ?? []);
  const [catalogStates, setCatalogStates] = useState<GeoState[]>(initialCatalog?.states ?? []);
  const [catalogReady, setCatalogReady] = useState(!!initialCatalog);
  const [regionsTabMounted, setRegionsTabMounted] = useState(subTab === 'regions');

  const refreshGeoCatalog = useCallback(async () => {
    const { regions, states } = await loadManagementGeoCatalog(true);
    setCatalogRegions(regions);
    setCatalogStates(states);
    setCatalogReady(true);
    return { regions, states };
  }, []);

  useEffect(() => {
    if (subTab === 'regions') setRegionsTabMounted(true);
  }, [subTab]);

  useEffect(() => {
    let active = true;
    loadManagementGeoCatalog()
      .then(({ regions, states }) => {
        if (!active) return;
        setCatalogRegions(regions);
        setCatalogStates(states);
        setCatalogReady(true);
      })
      .catch(() => {
        if (active) setError('Failed to load geography data');
      });
    return () => { active = false; };
  }, [setError]);

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

      {!catalogReady ? (
        <div className="p-12 flex justify-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className={subTab === 'users' ? undefined : 'hidden'}>
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
              catalogRegions={catalogRegions}
              catalogStates={catalogStates}
            />
          </div>

          {regionsTabMounted && (
            <div className={subTab === 'regions' ? undefined : 'hidden'}>
              <RegionManagementTab
                setError={setError}
                catalogStates={catalogStates}
                onGeoRefresh={refreshGeoCatalog}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManagementTab;
