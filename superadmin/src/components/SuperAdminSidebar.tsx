import React from 'react';
import { SuperAdminTab } from '../types/superadmin';
import {
  TrendingUp,
  ShieldCheck,
  ClipboardList,
  Sliders,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SuperAdminSidebarProps {
  currentTab: SuperAdminTab;
  onTabChange: (tab: SuperAdminTab) => void;
  adminCount: number;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  currentTab,
  onTabChange,
  adminCount,
}) => {
  const navItems = [
    {
      id: 'analytics' as SuperAdminTab,
      label: 'Executive Analytics',
      desc: 'Revenue, margins & throughput',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'admins' as SuperAdminTab,
      label: 'Workshop Admins',
      desc: 'Create & manage managers',
      icon: ShieldCheck,
      badge: `${adminCount} Active`,
    },
    {
      id: 'audit' as SuperAdminTab,
      label: 'Master Audit Trail',
      desc: 'Full security & change logs',
      icon: ClipboardList,
      badge: null,
    },
    {
      id: 'settings' as SuperAdminTab,
      label: 'Shop Policies & Config',
      desc: 'Global workshop parameters',
      icon: Sliders,
      badge: null,
    },
  ];

  return (
    <aside className="w-full lg:w-72 bg-slate-900/90 lg:min-h-[calc(100vh-65px)] border-b lg:border-b-0 lg:border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Executive Controls
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                    </div>
                  </div>

                  {item.badge ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/20">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Executive Info Box */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/90 rounded-2xl p-4 border border-slate-700/60 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sole Authority Mode</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Bilang Super Admin / Owner, ikaw lamang ang may karapatang magtalaga at mag-activate ng
            mga <span className="text-white font-medium">Workshop Admins</span>. Ang mga Admin naman ang namamahala sa mga Staff (Mekaniko).
          </p>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-800 text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          MotoCare Multi-Tier Architecture &copy; 2026
        </p>
        <p className="text-[10px] text-slate-600">Enterprise Shop Owner Portal</p>
      </div>
    </aside>
  );
};
