import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LogOut, Send, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const PROFILE_ERROR = 'Unable to open customer profile. Please try again.';

function safeCloseTab(tab: Window | null | undefined): void {
  if (!tab || tab.closed) return;
  try {
    tab.close();
  } catch {
    // Tab may already be closed or inaccessible.
  }
}

function openBlankTab(): Window | null {
  try {
    return window.open('about:blank', '_blank');
  } catch {
    return null;
  }
}

function extractPwaUrl(data: Record<string, unknown>): string | null {
  const nested = data.data;
  const fromNested =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>).pwaUrl
      : undefined;
  const candidate = data.pwaUrl ?? fromNested;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  return null;
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
    return out;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }
  return out;
}

function findInvalidSapCodeMessage(payload: unknown): string | null {
  const match = collectStrings(payload).find((s) => /invalid sap code/i.test(s.trim()));
  return match?.trim() ?? null;
}

function getResponsePayload(error: unknown): unknown {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    return response?.data;
  }
  return undefined;
}

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
    const vcpMobile = mobileNumber.trim();
    if (vcpMobile && !/^[0-9]{10}$/.test(vcpMobile)) {
      errs.mobileNumber = 'Must be exactly 10 digits';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMsg(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const pwaTab = openBlankTab();
    setIsSubmitting(true);

    const handleFailure = (actualError: unknown, responsePayload?: unknown) => {
      console.error('Submission failed', actualError);
      safeCloseTab(pwaTab);
      setIsSubmitting(false);

      const invalidSapMsg = findInvalidSapCodeMessage(responsePayload ?? getResponsePayload(actualError));
      if (invalidSapMsg) {
        setError(invalidSapMsg);
        return;
      }

      setError(PROFILE_ERROR);
    };

    try {
      const res = await api.post('/api/submission', {
        sapCode: sapCode.trim(),
        mobileNumber: mobileNumber.trim(),
      });

      const payload = res.data as Record<string, unknown>;
      if (payload.success === false) {
        handleFailure(payload, payload);
        return;
      }

      const pwaUrl = extractPwaUrl(payload);
      if (!pwaUrl) {
        console.warn('Submission succeeded but PWA URL is missing');
        handleFailure({ reason: 'missing pwa url', response: payload }, payload);
        return;
      }

      if (pwaTab) {
        pwaTab.location.href = pwaUrl;
      } else {
        const fallbackTab = window.open(pwaUrl, '_blank');
        if (!fallbackTab) {
          handleFailure({ reason: 'popup blocked', response: payload }, payload);
          return;
        }
      }

      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors: ['#349688', '#FFA525', '#BF7000'] });
      setSuccessMsg('Launching secure PWA module…');
      setIsSubmitting(false);
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      handleFailure(err, getResponsePayload(err));
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Navbar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 px-3 sm:px-6 md:px-10 flex justify-between items-center gap-2 sticky top-0 z-30 min-h-16 py-2 sm:py-0">
        <div className="flex items-center shrink-0">
          <img src="/logo.svg" alt="Humbee" className="h-7 sm:h-8 object-contain" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-slate-700 truncate max-w-[32vw] min-[375px]:max-w-[40vw] sm:max-w-none">
            {user?.name}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 shrink-0 px-2 sm:px-3 py-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-[10px] sm:text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Logout</span>
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
                  placeholder="e.g. 0077100938"
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
                  VCP Mobile Number (Optional)
                </label>
                <input
                  id="mobile-number"
                  type="tel"
                  placeholder="Enter 10-digit VCP mobile (optional)"
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
