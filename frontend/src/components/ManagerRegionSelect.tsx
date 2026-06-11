import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { GeoRegion } from '../types/geo';

interface Props {
  assignedRegionIds: string[];
  onChange: (assignedRegionIds: string[]) => void;
}

const ManagerRegionSelect: React.FC<Props> = ({ assignedRegionIds, onChange }) => {
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/internal/regions')
      .then((res) => {
        const data = (res.data.data ?? []).filter((region: GeoRegion & { status?: string }) => region.status !== 'inactive');
        setRegions(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleRegion = (regionId: string) => {
    onChange(
      assignedRegionIds.includes(regionId)
        ? assignedRegionIds.filter((id) => id !== regionId)
        : [...assignedRegionIds, regionId],
    );
  };

  if (loading) {
    return <div className="text-xs text-slate-400">Loading regions...</div>;
  }

  if (!regions.length) {
    return (
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
        No regions configured yet. Create regions in the Regions tab first.
      </div>
    );
  }

  return (
    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        Assigned Regions
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {regions.map((region) => (
          <label key={region.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={assignedRegionIds.includes(region.id)}
              onChange={() => toggleRegion(region.id)}
              className="rounded border-slate-300"
            />
            {region.regionName}
          </label>
        ))}
      </div>
    </div>
  );
};

export default ManagerRegionSelect;
