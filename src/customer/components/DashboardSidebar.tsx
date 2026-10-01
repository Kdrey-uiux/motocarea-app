import { TabType, UserProfile } from '../../types/dashboard';
import {
  LayoutGrid,
  Calendar,
  History,
  LogOut,
  X,
  Wrench,
  Settings,
} from 'lucide-react';

interface DashboardSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  userProfile,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isSidebarCollapsed,
}: DashboardSidebarProps) {
  const navItems = [
    { id: 'overview' as TabType, label: 'Dashboard', icon: LayoutGrid },
    { id: 'book' as TabType, label: 'Book Service', icon: Calendar },
    { id: 'history' as TabType, label: 'Service Records', icon: History },
  ];

  return (
    <>
      {/* 1. MOBILE SLIDE-OVER DRAWER (md:hidden) */}
      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] h-[100dvh] bg-white shadow-2xl flex flex-col justify-between p-4 sm:p-5 border-r border-slate-100 transition-transform duration-300 ease-in-out md:hidden overscroll-contain ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header of Mobile Drawer */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between w-full shrink-0">
            <div
              onClick={() => {
                setActiveTab('overview');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 leading-tight block">
                  Moto<span className="text-orange-500">Care</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Rider Portal
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex flex-col gap-2 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full h-12 px-4 rounded-2xl flex items-center gap-3.5 transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile, Settings & Logout in Mobile Drawer */}
        <div className="flex flex-col gap-2.5 w-full pt-4 border-t border-slate-100 shrink-0">
          {/* User Identity Card */}
          <div
            onClick={() => {
              setActiveTab('profile');
              setIsMobileMenuOpen(false);
            }}
            className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition cursor-pointer flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'K'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {userProfile?.full_name || 'Rider Member'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {userProfile?.phone_number || userProfile?.email || 'View Profile'}
              </div>
            </div>
          </div>

          {/* Settings & Policies Button (Directly under Profile) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full h-11 px-4 rounded-2xl flex items-center gap-3 transition-all duration-200 cursor-pointer text-left ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">Settings & Policies</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full h-11 px-4 rounded-2xl flex items-center gap-3 text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold text-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. DESKTOP FLOATING SLIM PILL SIDEBAR (hidden md:flex) */}
      <aside
        className={`hidden md:flex sticky top-0 inset-y-0 left-0 z-40 flex-col justify-between h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed
            ? 'w-0 p-0 opacity-0 pointer-events-none overflow-hidden'
            : 'w-24 py-6 pl-5 pr-0 opacity-100'
        }`}
      >
        <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-xs flex flex-col justify-between items-center py-6 px-3 h-full w-full">
          {/* Top Logo */}
          <div className="flex flex-col items-center gap-5 w-full">
            <div
              onClick={() => setActiveTab('overview')}
              className="flex items-center justify-center cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 transition shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
            </div>

            {/* Desktop Navigation Items (Icon-only with Tooltip) */}
            <nav className="flex flex-col items-center gap-2.5 w-full mt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer group relative ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105 font-semibold'
                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />

                    {/* Desktop Tooltip */}
                    <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions: User, Settings & Logout */}
          <div className="flex flex-col items-center gap-2.5 w-full pt-4 border-t border-slate-100">
            {/* User Profile Avatar Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition cursor-pointer group relative ${
                activeTab === 'profile'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-xs hover:scale-105'
              }`}
              title={userProfile?.full_name || 'Account Profile'}
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'K'}
              </div>

              {/* Desktop Tooltip */}
              <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                {userProfile?.full_name || 'Account Profile'}
              </span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer group relative ${
                activeTab === 'settings'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Settings & Policies"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                Settings & Policies
              </span>
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={onLogout}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer group relative"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
