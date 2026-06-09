import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, AlertCircle, Info } from 'lucide-react';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{4,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

const Login: React.FC = () => {
  const { login, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const location = useLocation();
  const from = (location.state as any)?.from?.pathname;

  const validate = () => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errs.username = 'Username is required';
    } else if (!USERNAME_REGEX.test(username.trim())) {
      errs.username = 'Username must be 4–20 characters (letters, numbers, underscores only)';
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
      const { role } = await login(username.trim(), password);
      const dest = from || (role === 'admin' ? '/admin' : '/submission');
      // Full page load so the latest app bundle is always used (avoids stale SPA state after PWA redirect)
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
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Humbee" className="h-10 object-contain mb-3" />
          <p className="text-slate-500 text-sm font-medium tracking-wide">Enterprise Application Access</p>
        </div>

        {/* Card */}
        <div className="premium-card p-8 md:p-10 bg-white/90 backdrop-blur-md">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Welcome back</h1>
            <p className="text-slate-400 text-xs mt-1">Sign in to access the portal.</p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-xs font-semibold text-slate-600 block">
                Username
              </label>
              <div className="input-wrapper">
                <User
                  className="input-wrapper-icon w-4 h-4 text-slate-400"
                  aria-hidden
                />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: undefined })); }}
                  disabled={isSubmitting}
                  className={`input-style ${fieldErrors.username ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}`}
                />
              </div>
              {fieldErrors.username ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fieldErrors.username}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  4–20 characters · letters, numbers, underscores · no spaces
                </p>
              )}
            </div>

            {/* Password */}
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
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
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

          {/* Demo credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Demo Credentials
            </span>
            <div className="flex justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="font-semibold block text-slate-700">User</span>
                <span>user / User1234</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="font-semibold block text-slate-700">Admin</span>
                <span>admin / Admin1234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
