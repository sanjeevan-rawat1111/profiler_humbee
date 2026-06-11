import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { GeoDistrict, GeoRegion, GeoState } from '../types/geo';

interface Props {
  regionId: string;
  stateId: string;
  districtId: string;
  onChange: (regionId: string, stateId: string, districtId: string) => void;
  disabled?: boolean;
  showRegion?: boolean;
  className?: string;
}

const RegionStateDistrictSelect: React.FC<Props> = ({
  regionId,
  stateId,
  districtId,
  onChange,
  disabled = false,
  showRegion = true,
  className = '',
}) => {
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [states, setStates] = useState<GeoState[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingRegions(true);
    api.get('/api/internal/geo/regions')
      .then((res) => { if (active) setRegions(res.data.data ?? []); })
      .finally(() => { if (active) setLoadingRegions(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingStates(true);
    const params = regionId ? { regionId } : {};
    api.get('/api/internal/geo/states', { params })
      .then((res) => {
        if (!active) return;
        const nextStates: GeoState[] = res.data.data ?? [];
        setStates(nextStates);
        if (stateId && !nextStates.some((state) => state.id === stateId)) {
          onChange(regionId, '', '');
        }
      })
      .finally(() => { if (active) setLoadingStates(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

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
