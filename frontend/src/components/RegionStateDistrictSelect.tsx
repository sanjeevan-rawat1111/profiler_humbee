import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { loadRegions, loadStates } from '../services/geoCatalog';
import type { GeoDistrict, GeoRegion, GeoState } from '../types/geo';

function filterStatesByRegion(states: GeoState[], regionId: string) {
  if (!regionId) return states;
  return states.filter((state) => state.regionId === regionId);
}

interface Props {
  regionId: string;
  stateId: string;
  districtId: string;
  onChange: (regionId: string, stateId: string, districtId: string) => void;
  disabled?: boolean;
  showRegion?: boolean;
  className?: string;
  catalogRegions?: GeoRegion[];
  catalogStates?: GeoState[];
}

const RegionStateDistrictSelect: React.FC<Props> = ({
  regionId,
  stateId,
  districtId,
  onChange,
  disabled = false,
  showRegion = true,
  className = '',
  catalogRegions,
  catalogStates,
}) => {
  const usesCatalog = catalogRegions !== undefined && catalogStates !== undefined;

  const [fetchedRegions, setFetchedRegions] = useState<GeoRegion[]>([]);
  const [fetchedStates, setFetchedStates] = useState<GeoState[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(!usesCatalog);
  const [loadingStates, setLoadingStates] = useState(!usesCatalog);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const regions = usesCatalog ? catalogRegions : fetchedRegions;
  const states = useMemo(
    () => filterStatesByRegion(usesCatalog ? catalogStates! : fetchedStates, regionId),
    [usesCatalog, catalogStates, fetchedStates, regionId],
  );

  useEffect(() => {
    if (usesCatalog) return;

    let active = true;
    setLoadingRegions(true);
    loadRegions()
      .then((data) => { if (active) setFetchedRegions(data); })
      .finally(() => { if (active) setLoadingRegions(false); });
    return () => { active = false; };
  }, [usesCatalog]);

  useEffect(() => {
    if (usesCatalog) {
      if (stateId && !states.some((state) => state.id === stateId)) {
        onChange(regionId, '', '');
      }
      return;
    }

    let active = true;
    setLoadingStates(true);
    loadStates(regionId || undefined)
      .then((nextStates) => {
        if (!active) return;
        setFetchedStates(nextStates);
        if (stateId && !nextStates.some((state) => state.id === stateId)) {
          onChange(regionId, '', '');
        }
      })
      .finally(() => { if (active) setLoadingStates(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesCatalog, regionId, catalogStates]);

  useEffect(() => {
    if (!stateId) {
      setDistricts([]);
      return;
    }

    let active = true;
    setLoadingDistricts(true);
    api.get(`/api/internal/geo/states/${stateId}/districts`)
      .then((res) => {
        if (!active) return;
        const nextDistricts: GeoDistrict[] = res.data.data ?? [];
        setDistricts(nextDistricts);
        if (districtId && !nextDistricts.some((district) => district.id === districtId)) {
          onChange(regionId, stateId, '');
        }
      })
      .finally(() => { if (active) setLoadingDistricts(false); });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId]);

  const gridClass = showRegion ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {showRegion && (
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Region</label>
          <select
            value={regionId}
            onChange={(e) => onChange(e.target.value, '', '')}
            disabled={disabled || loadingRegions}
            className="input-style-compact w-full"
          >
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>{region.regionName}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">State</label>
        <select
          value={stateId}
          onChange={(e) => onChange(regionId, e.target.value, '')}
          disabled={disabled || loadingStates}
          className="input-style-compact w-full"
        >
          <option value="">All States</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>{state.stateName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">District</label>
        <select
          value={districtId}
          onChange={(e) => onChange(regionId, stateId, e.target.value)}
          disabled={disabled || !stateId || loadingDistricts}
          className="input-style-compact w-full"
        >
          <option value="">{stateId ? 'All Districts' : 'Select State first'}</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>{district.districtName}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RegionStateDistrictSelect;
