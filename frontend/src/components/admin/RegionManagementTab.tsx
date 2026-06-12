import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { loadRegionsList } from '../../services/regionsListCache';
import type { GeoRegionDetail, GeoState } from '../../types/geo';
import { formatDateTime } from '../../utils/adminApi';

interface Props {
  setError: (msg: string | null) => void;
  catalogStates?: GeoState[];
  onGeoRefresh?: () => Promise<unknown>;
}

const RegionManagementTab: React.FC<Props> = ({ setError, catalogStates = [], onGeoRefresh }) => {
  const [regions, setRegions] = useState<GeoRegionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedStateIds, setSelectedStateIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchRegions = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setRegions(await loadRegionsList(force));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const resetForm = () => {
    setEditingId(null);
    setRegionName('');
    setStatus('active');
    setSelectedStateIds([]);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (region: GeoRegionDetail) => {
    setEditingId(region.id);
    setRegionName(region.regionName);
    setStatus(region.status === 'inactive' ? 'inactive' : 'active');
    setSelectedStateIds(region.states.map((state) => state.id));
    setShowForm(true);
  };

  const toggleState = (stateId: string) => {
    setSelectedStateIds((prev) => (
      prev.includes(stateId) ? prev.filter((id) => id !== stateId) : [...prev, stateId]
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regionName.trim()) {
      setError('Region name is required');
      return;
    }

    try {
      const payload = {
        regionName: regionName.trim(),
        status,
        stateIds: selectedStateIds,
      };

      if (editingId) {
        await api.put(`/api/internal/regions/${editingId}`, payload);
      } else {
        await api.post('/api/internal/regions', payload);
      }
      resetForm();
      await onGeoRefresh?.();
      await fetchRegions(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save region');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this region? States will be unassigned.')) return;
    try {
      await api.delete(`/api/internal/regions/${id}`);
      await onGeoRefresh?.();
      await fetchRegions(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete region');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={openCreate}
          className="px-3 py-2 bg-humbee-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Region
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-2xl space-y-4">
          <h4 className="text-sm font-bold text-slate-700">{editingId ? 'Edit Region' : 'New Region'}</h4>
          <input
            type="text"
            placeholder="Region name (e.g. North, South)"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            className="input-style-compact w-full"
            required
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="input-style-compact w-full"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Map States
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-slate-100 rounded-xl p-3">
              {catalogStates.map((state) => (
                <label key={state.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStateIds.includes(state.id)}
                    onChange={() => toggleState(state.id)}
                    className="rounded border-slate-300"
                  />
                  {state.stateName}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-humbee-500 text-white rounded-lg text-xs font-semibold cursor-pointer">
              {editingId ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : regions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No regions created yet</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="p-4 text-left">Region Name</th>
                <th className="p-4 text-left">States Mapped</th>
                <th className="p-4 text-left">Created Date</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regions.map((region) => (
                <tr key={region.id}>
                  <td className="p-4 font-bold text-slate-800">{region.regionName}</td>
                  <td className="p-4 text-slate-600">{region.stateCount}</td>
                  <td className="p-4 text-slate-400">{formatDateTime(region.createdAt)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      region.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}
                    >
                      {region.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(region)} className="p-2 border rounded-lg hover:bg-slate-50 cursor-pointer" title="Edit">
                        <Pencil className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={() => handleDelete(region.id)} className="p-2 border rounded-lg hover:bg-red-50 cursor-pointer" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RegionManagementTab;
