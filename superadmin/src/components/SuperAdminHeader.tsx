import React from 'react';
import { SuperAdminProfile } from '../types/superadmin';
import { ShieldAlert, LogOut, User, Activity, ExternalLink } from 'lucide-react';

interface SuperAdminHeaderProps {
  profile: SuperAdminProfile;
  onLogout: () => void;
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ profile, onLogout }) => {
  const currentDate = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-white text-base">
                MOTOCARE<span className="text-amber-400">.EXEC</span>
              </span>
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-widest">
                Super Admin / Owner
              </span>
            </div>
            <p className="text-xs text-slate-400">Executive Two-Wheel Business Operations</p>
          </div>
        </div>

        {/* Live Info & User Controls */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">System Live</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{currentDate}</span>
          </div>

          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-700/40"
            title="Open Workshop Admin Console in new tab"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Workshop Admin</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          {/* User Badge */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{profile.fullName}</p>
              <p className="text-[11px] text-amber-400/90 font-medium">{profile.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-[1.5px] flex items-center justify-center shadow-md">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-400">
                <User className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Logout from Executive Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
