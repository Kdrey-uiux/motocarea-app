import React, { useState } from 'react';
import { verifySuperAdmin, setStoredSuperAdminSession } from '../utils/superAdminManager';
import { SuperAdminProfile } from '../types/superadmin';
import { ShieldAlert, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface SuperAdminLoginProps {
  onLoginSuccess: (profile: SuperAdminProfile) => void;
}

export const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = verifySuperAdmin(email, password);
    setLoading(false);

    if (res.success && res.profile) {
      setStoredSuperAdminSession(res.profile);
      onLoginSuccess(res.profile);
    } else {
      setError(res.error || 'Hindi makapag-login. Pakisuri ang kredensyal.');
    }
  };

  const handleQuickDemo = () => {
    setEmail('owner@motocare.com');
    setPassword('owner123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-xl shadow-amber-500/20 text-slate-950 mb-2">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            MOTOCARE<span className="text-amber-400">.EXEC</span>
          </h1>
          <p className="text-xs font-semibold text-amber-400/90 tracking-widest uppercase">
            Shop Owner & Executive Portal
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Eksklusibong pampangasiwaang portal para sa may-ari ng negosyo. Dito nililikha ang mga Admin accounts at sinusuri ang kabuuang kita.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Owner Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@motocare.com"
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Owner Secret Key / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Pumapasok...' : 'Mag-log in bilang Super Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pindutin para sa Default Owner Credentials</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Demo: <code className="text-amber-400">owner@motocare.com</code> /{' '}
              <code className="text-amber-400">owner123</code>
            </p>
          </div>
        </div>

        {/* Cross-Link info */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>Kailangan ba ng Workshop Operations console?</p>
          <a
            href="http://localhost:5174"
            className="text-amber-400 hover:underline font-semibold"
          >
            Pumunta sa Workshop Admin (Port 5174) &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};
