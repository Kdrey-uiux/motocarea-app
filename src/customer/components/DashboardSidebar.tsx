import { TabType, UserProfile } from '../../types/dashboard';
import {
  LayoutGrid,
  Calendar,
  History,
  LogOut,
  X,
  Wrench,
  Settings,
  ChevronRight,
  MapPin,
  Navigation,
} from '../../components/icons';
import { SHOP_INFO, SHOP_DIRECTIONS_URL } from '../../utils/shopInfo';
import MotoCareLogo from '../../components/brand/MotoCareLogo';

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
    { id: 'overview' as TabType, label: 'Dashboard', icon: LayoutGrid, hint: 'Your bookings at a glance' },
    { id: 'book' as TabType, label: 'Book Service', icon: Calendar, hint: 'Pick a service and a date' },
    { id: 'history' as TabType, label: 'Service Records', icon: History, hint: 'Past repairs and receipts' },
  ];
  const initial = userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'R';
  // Google sign-ups have no phone yet ('N/A')
  const contactLine =
    (userProfile?.phone_number !== 'N/A' && userProfile?.phone_number) || userProfile?.email || 'View profile';

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
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] h-[100dvh] bg-page rounded-r-[1.75rem] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out md:hidden overscroll-contain ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Soft orange fade, same as the landing page menu */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 w-[24rem] h-[24rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.13)_0%,rgba(249,115,22,0)_65%)]"
        />

        <div className="relative flex-1 flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
          {/* Brand + close */}
          <div className="flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-left">
                <MotoCareLogo className="h-12 w-auto text-slate-900" />
                <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">Rider portal</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-9 h-9 rounded-full bg-white border border-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="bg-white rounded-2xl border border-slate-200/70 p-1.5 shrink-0">
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
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition cursor-pointer text-left ${
                    isActive ? 'bg-orange-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${isActive ? 'text-orange-700' : 'text-slate-900'}`}>
                      {item.label}
                    </span>
                    <span className="block text-xs text-slate-400 truncate">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Shop location */}
          <a
            href={SHOP_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 bg-white rounded-2xl border border-slate-200/70 px-3.5 py-3 hover:border-orange-200 transition shrink-0"
          >
            <MapPin className="w-[18px] h-[18px] text-orange-500 shrink-0 mt-0.5" />
            {/* Address gets the full width; the directions link sits under it */}
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-slate-700 leading-snug">{SHOP_INFO.address}</span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                Get directions
                <Navigation className="w-3 h-3" />
              </span>
            </span>
          </a>
        </div>

        {/* Profile, settings & sign out */}
        <div className="relative shrink-0 p-4 pt-3 border-t border-slate-200/70 space-y-2">
          {/* Profile card (opens My Profile) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full p-3 rounded-2xl bg-white border card-elevated transition cursor-pointer flex items-center gap-3 text-left ${
              activeTab === 'profile' ? 'border-orange-300' : 'border-slate-200/70 hover:border-orange-200'
            }`}
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900 truncate">{userProfile?.full_name || 'Rider'}</span>
              <span className="block text-xs text-slate-500 truncate">{contactLine}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsMobileMenuOpen(false);
              }}
              className={`h-11 rounded-full border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Settings
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-11 rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* 2. DESKTOP FLOATING SLIM PILL SIDEBAR (hidden md:flex) */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-40 flex-col justify-between h-screen transition-all duration-300 ease-in-out ${
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
