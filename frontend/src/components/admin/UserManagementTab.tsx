import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Eye, EyeOff, FileDown, FileSpreadsheet } from 'lucide-react';
import api from '../../services/api';
import SearchableMultiSelect from './SearchableMultiSelect';
import StateDistrictSelect from '../StateDistrictSelect';
import type { DBUser, UserManagementFilters } from '../../types/admin';
import { defaultUserManagementFilters } from '../../types/admin';
import { formatDateTime } from '../../utils/adminApi';

const STATUS_OPTIONS = ['Active', 'Inactive'];
const ROLE_OPTIONS = ['User', 'Admin'];
const MOBILE_REGEX = /^[0-9]{10}$/;

interface Props {
  users: DBUser[];
  mobileNumberOptions: string[];
  loading: boolean;
  filters: UserManagementFilters;
  onFiltersChange: (filters: UserManagementFilters) => void;
  currentUserId?: string;
  onRefresh: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  setError: (msg: string | null) => void;
}

const UserManagementTab: React.FC<Props> = ({
  users,
  mobileNumberOptions,
  loading,
  filters,
  onFiltersChange,
  currentUserId,
  onRefresh,
  onExportCsv,
  onExportExcel,
  setError,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [form, setForm] = useState({
    name: '',
    mobileNumber: '',
    password: '',
    stateId: '',
    districtId: '',
    role: 'user' as 'user' | 'admin',
    status: 'active' as 'active' | 'inactive',
  });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; mobileNumber?: string; geo?: string }>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [passwordCache, setPasswordCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => () => setSuccessMessage(null), []);

  const selectedStatuses = filters.statuses.map(
    (status) => status.charAt(0).toUpperCase() + status.slice(1),
  );

  const updateFilters = (patch: Partial<UserManagementFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const clearFilters = () => {
    onFiltersChange(defaultUserManagementFilters);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', mobileNumber: '', password: '', stateId: '', districtId: '', role: 'user', status: 'active' });
    setFieldErrors({});
    setShowForm(true);
  };

  const openEdit = (user: DBUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      mobileNumber: user.mobileNumber,
      password: '',
      stateId: user.stateId ?? '',
      districtId: user.districtId ?? '',
      role: user.role as 'user' | 'admin',
      status: user.status as 'active' | 'inactive',
    });
    setFieldErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errs: { name?: string; mobileNumber?: string; geo?: string } = {};
    if (!form.name.trim()) {
      errs.name = 'Name is required.';
    }
    if (!form.mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile Number is required.';
    } else if (!MOBILE_REGEX.test(form.mobileNumber.trim())) {
      errs.mobileNumber = 'Please enter a valid 10-digit Mobile Number.';
    }
    if (!form.stateId || !form.districtId) {
      errs.geo = 'State and District are required.';
    }
    return errs;
  };

  const togglePasswordVisibility = async (userId: string) => {
    if (visiblePasswords.has(userId)) {
      setVisiblePasswords((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      return;
    }

    if (!passwordCache[userId]) {
      try {
        const res = await api.get(`/api/internal/users/${userId}/password`);
        const password = res.data.data?.password ?? null;
        if (password) {
          setPasswordCache((prev) => ({ ...prev, [userId]: password }));
        }
      } catch {
        setError('Failed to load password');
        return;
      }
    }

    setVisiblePasswords((prev) => new Set(prev).add(userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const errs = validateForm();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      if (editingUser) {
        const payload: Record<string, string> = {
          name: form.name,
          mobileNumber: form.mobileNumber,
          stateId: form.stateId,
          districtId: form.districtId,
          role: form.role,
          status: form.status,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/api/internal/users/${editingUser.id}`, payload);
        if (form.password) {
          setPasswordCache((prev) => ({ ...prev, [editingUser.id]: form.password }));
        }
        setSuccessMessage('User updated successfully');
      } else {
        if (!form.password) {
          setError('Password is required for new users');
          return;
        }
        const res = await api.post('/api/internal/users', form);
        const created = res.data.data ?? res.data;
        if (created?.id) {
          setPasswordCache((prev) => ({ ...prev, [created.id]: form.password }));
        }
        setSuccessMessage('User created successfully');
      }
      setShowForm(false);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUserId) {
      setError('Cannot delete your own account');
      return;
    }
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/api/internal/users/${id}`);
      setSuccessMessage('User deleted');
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const hasActiveFilters = filters.stateId || filters.districtId || filters.mobileNumbers.length > 0 || filters.role || filters.statuses.length > 0;

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">Create, edit and manage database accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExportCsv} className="px-3 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={onExportExcel} className="px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button onClick={openCreate} className="px-3 py-2 bg-humbee-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchableMultiSelect
            label="Mobile Number"
            placeholder="Search mobile number..."
            options={mobileNumberOptions}
            selected={filters.mobileNumbers}
            onChange={(mobileNumbers) => updateFilters({ mobileNumbers })}
          />
          <SearchableMultiSelect
            label="Status"
            placeholder="Select status..."
            options={STATUS_OPTIONS}
            selected={selectedStatuses}
            onChange={(statuses) => updateFilters({
              statuses: statuses.map((status) => status.toLowerCase()),
            })}
          />
          <div className="min-w-[180px] flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => updateFilters({ role: e.target.value })}
              className="input-style-compact w-full min-h-[42px] rounded-xl"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role.toLowerCase()}>{role}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[320px] flex-[2]">
            <StateDistrictSelect
              stateId={filters.stateId}
              districtId={filters.districtId}
              onChange={(stateId, districtId) => updateFilters({ stateId, districtId })}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold">Active filters applied</span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-humbee-700 font-semibold hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-lg space-y-4">
          <h4 className="text-sm font-bold text-slate-700">{editingUser ? 'Edit User' : 'New User'}</h4>
          <div>
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setFieldErrors((p) => ({ ...p, name: undefined }));
              }}
              className={`input-style-compact w-full ${fieldErrors.name ? 'border-red-400' : ''}`}
              required
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <input
              type="tel"
              placeholder="Mobile Number (10 digits)"
              value={form.mobileNumber}
              onChange={(e) => {
                setForm({ ...form, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) });
                setFieldErrors((p) => ({ ...p, mobileNumber: undefined }));
              }}
              className={`input-style-compact w-full ${fieldErrors.mobileNumber ? 'border-red-400' : ''}`}
              maxLength={10}
              required
            />
            {fieldErrors.mobileNumber && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.mobileNumber}</p>
            )}
          </div>
          <input
            type="password"
            placeholder={editingUser ? 'New password (optional)' : 'Password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-style-compact w-full"
            required={!editingUser}
          />
          <StateDistrictSelect
            stateId={form.stateId}
            districtId={form.districtId}
            onChange={(stateId, districtId) => {
              setForm({ ...form, stateId, districtId });
              setFieldErrors((p) => ({ ...p, geo: undefined }));
            }}
            required
          />
          {fieldErrors.geo && (
            <p className="text-xs text-red-600">{fieldErrors.geo}</p>
          )}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'user' | 'admin' })} className="input-style-compact w-full">
            <option value="user">User</option>
            <option value="admin">Administrator</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className="input-style-compact w-full">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-humbee-500 text-white rounded-lg text-xs font-semibold cursor-pointer">{editingUser ? 'Save' : 'Create'}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500">{users.length} user(s) shown</span>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No users match the selected filters</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">User Mobile</th>
                <th className="p-4 text-left">Password</th>
                <th className="p-4 text-left">State</th>
                <th className="p-4 text-left">District</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Created At</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-4 font-bold text-slate-800">{u.name}</td>
                  <td className="p-4 font-mono font-bold text-slate-800">{u.mobileNumber}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">
                        {visiblePasswords.has(u.id) ? (passwordCache[u.id] || '—') : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(u.id)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-400 cursor-pointer"
                        aria-label={visiblePasswords.has(u.id) ? 'Hide password' : 'Show password'}
                      >
                        {visiblePasswords.has(u.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{u.state}</td>
                  <td className="p-4 text-slate-600">{u.district}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                  </td>
                  <td className="p-4 text-slate-400">{formatDateTime(u.createdAt)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{u.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-2 border rounded-lg hover:bg-slate-50 cursor-pointer" title="Edit"><Pencil className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => handleDelete(u.id)} disabled={u.id === currentUserId} className="p-2 border rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-40" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
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

export default UserManagementTab;
