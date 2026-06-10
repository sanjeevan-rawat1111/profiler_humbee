import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LogOut, Send, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const Submission: React.FC = () => {
  const { user, logout } = useAuth();
  const [sapCode, setSapCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ sapCode?: string; mobileNumber?: string }>({});

  const handleLogout = () => {
    logout(); // AuthContext.logout already calls navigate('/login', {replace:true})
  };

  const validate = () => {
    const errs: { sapCode?: string; mobileNumber?: string } = {};
    if (!sapCode.trim()) errs.sapCode = 'SAP Code is required';
    if (!mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile Number is required';
    } else if (!/^[0-9]{10}$/.test(mobileNumber.trim())) {
      errs.mobileNumber = 'Must be exactly 10 digits';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/submission', {
        sapCode: sapCode.trim(),
        mobileNumber: mobileNumber.trim(),
      });

      // Handle both old and new response shape
      const pwaUrl = res.data.data?.pwaUrl ?? res.data.pwaUrl;

      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors: ['#349688', '#FFA525', '#BF7000'] });
      setSuccessMsg('Launching secure PWA module…');

      setTimeout(() => { window.location.href = pwaUrl; }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Submission failed. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Navbar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 py-0 px-6 md:px-10 flex justify-between items-center sticky top-0 z-30 h-16">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Humbee" className="h-8 object-contain" />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-700 block">{user?.mobileNumber}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-humbee-50/40 -z-10 blur-3xl" />
        <div className="absolute bottom-[10%] left-[-15%] w-[40rem] h-[40rem] rounded-full bg-slate-100/60 -z-10 blur-3xl" />

        <div className="w-full max-w-[500px]">
          <div className="premium-card p-8 md:p-10 bg-white/95 backdrop-blur-md">
            {/* Header */}
            <div className="mb-8 text-center">
              <img src="/logo.svg" alt="HumBee" className="h-10 object-contain mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Customer Profiler</h2>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center gap-3 text-sm font-semibold">
                <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* SAP Code */}
              <div className="space-y-1.5">
                <label htmlFor="sap-code" className="text-xs font-semibold text-slate-600 block">
                  SAP Code
                </label>
                <input
                  id="sap-code"
                  type="text"
                  placeholder="e.g. SAP100938"
                  value={sapCode}
                  onChange={(e) => { setSapCode(e.target.value); setFieldErrors(p => ({ ...p, sapCode: undefined })); }}
                  disabled={isSubmitting}
                  className={`input-style h-14 ${fieldErrors.sapCode ? 'border-red-400 focus:border-red-400' : ''}`}
                />
                {fieldErrors.sapCode && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fieldErrors.sapCode}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label htmlFor="mobile-number" className="text-xs font-semibold text-slate-600 block">
                  Mobile Number
                </label>
                <input
                  id="mobile-number"
                  type="tel"
                  placeholder="10-digit number"
                  value={mobileNumber}
                  onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setFieldErrors(p => ({ ...p, mobileNumber: undefined })); }}
                  disabled={isSubmitting}
                  maxLength={10}
                  className={`input-style h-14 ${fieldErrors.mobileNumber ? 'border-red-400 focus:border-red-400' : ''}`}
                />
                {fieldErrors.mobileNumber && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fieldErrors.mobileNumber}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="submit-btn"
                className="btn-primary flex items-center justify-center gap-2 h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-5 border-t border-slate-100 bg-white/40 text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
        © 2026 Humbee Technologies Private Limited
      </footer>
    </div>
  );
};

export default Submission;
