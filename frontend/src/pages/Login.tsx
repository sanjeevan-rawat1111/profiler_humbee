import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Phone, AlertCircle, Info } from 'lucide-react';

const MOBILE_REGEX = /^[0-9]{10}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

const Login: React.FC = () => {
  const { login, clearError } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ mobileNumber?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const location = useLocation();
  const from = (location.state as any)?.from?.pathname;

  const validate = () => {
    const errs: { mobileNumber?: string; password?: string } = {};
    if (!mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile Number is required';
    } else if (!MOBILE_REGEX.test(mobileNumber.trim())) {
      errs.mobileNumber = 'Enter a valid 10-digit mobile number';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (!PASSWORD_REGEX.test(password)) {
      errs.password = 'Password must be ≥6 characters, include 1 uppercase letter and 1 number';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setServerError(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const { role } = await login(mobileNumber.trim(), password);
      const dest = from || (role === 'admin' ? '/admin' : '/submission');
      window.location.assign(dest);
    } catch (err: any) {
      setServerError(err.response?.data?.message ?? err.message ?? 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-humbee-50/50 -z-10 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-slate-100/50 -z-10 blur-3xl" />

      <div className="w-full max-w-[460px]">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Humbee" className="h-10 object-contain mb-3" />
          <p className="text-slate-500 text-sm font-medium tracking-wide">Customer Profiler</p>
        </div>

        <div className="premium-card p-8 md:p-10 bg-white/90 backdrop-blur-md">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Welcome back</h1>
            <p className="text-slate-400 text-xs mt-1">Sign in to access the portal.</p>
          </div>

          {serverError && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-mobile-number" className="text-xs font-semibold text-slate-600 block">
                Mobile Number
              </label>
              <div className="input-wrapper">
                <Phone
                  className="input-wrapper-icon w-4 h-4 text-slate-400"
                  aria-hidden
                />
                <input
                  id="login-mobile-number"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Enter mobile number"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setFieldErrors((p) => ({ ...p, mobileNumber: undefined }));
                  }}
                  disabled={isSubmitting}
                  maxLength={10}
                  className={`input-style ${fieldErrors.mobileNumber ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                />
              </div>
              {fieldErrors.mobileNumber ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fieldErrors.mobileNumber}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  Enter a valid 10-digit mobile number
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 block">
                Password
              </label>
              <div className="input-wrapper">
                <Lock
                  className="input-wrapper-icon w-4 h-4 text-slate-400"
                  aria-hidden
                />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                  disabled={isSubmitting}
                  className={`input-style ${fieldErrors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                />
              </div>
              {fieldErrors.password ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fieldErrors.password}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  ≥6 characters · 1 uppercase letter · 1 number
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary flex items-center justify-center gap-2 h-12 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Secure Login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
