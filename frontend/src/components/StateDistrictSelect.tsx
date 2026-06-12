import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { loadStates } from '../services/geoCatalog';
import type { GeoDistrict, GeoState } from '../types/geo';

interface Props {
  stateId: string;
  districtId: string;
  onChange: (stateId: string, districtId: string) => void;
  disabled?: boolean;
  stateLabel?: string;
  districtLabel?: string;
  required?: boolean;
  className?: string;
}

const StateDistrictSelect: React.FC<Props> = ({
  stateId,
  districtId,
  onChange,
  disabled = false,
  stateLabel = 'State',
  districtLabel = 'District',
  required = false,
  className = '',
}) => {
  const [states, setStates] = useState<GeoState[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingStates(true);
    loadStates()
      .then((data) => {
        if (!active) return;
        setStates(data);
      })
      .finally(() => {
        if (active) setLoadingStates(false);
      });
    return () => { active = false; };
  }, []);

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
        if (districtId && !nextDistricts.some((d) => d.id === districtId)) {
          onChange(stateId, '');
        }
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId]);

  const handleStateChange = (nextStateId: string) => {
    onChange(nextStateId, '');
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <div>
        {stateLabel && (
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {stateLabel}
          </label>
        )}
        <select
          value={stateId}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={disabled || loadingStates}
          required={required}
          className="input-style-compact w-full"
        >
          <option value="">Select State</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>{state.stateName}</option>
          ))}
        </select>
      </div>
      <div>
        {districtLabel && (
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {districtLabel}
          </label>
        )}
        <select
          value={districtId}
          onChange={(e) => onChange(stateId, e.target.value)}
          disabled={disabled || !stateId || loadingDistricts}
          required={required}
          className="input-style-compact w-full"
        >
          <option value="">{stateId ? 'Select District' : 'Select State first'}</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>{district.districtName}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default StateDistrictSelect;
