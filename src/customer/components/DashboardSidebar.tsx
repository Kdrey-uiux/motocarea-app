import { TabType, UserProfile } from '../../types/dashboard';
import {
  LayoutGrid,
  Calendar,
  History,
  User,
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
    { id: 'profile' as TabType, label: 'Account Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Floating Slim Pill Sidebar (Matches reference Dribbble style) */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 flex flex-col justify-between h-screen transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? 'translate-x-0 w-64 p-4 bg-white shadow-xl'
            : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarCollapsed
            ? 'md:w-0 md:p-0 md:opacity-0 md:pointer-events-none overflow-hidden'
            : 'md:w-24 md:py-6 md:pl-5 md:pr-0 md:opacity-100'
        }`}
      >
        <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-xs flex flex-col justify-between items-center py-6 px-3 h-full w-full">
          {/* Top Logo / Mobile Close */}
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="flex items-center justify-between w-full px-2 md:justify-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overview');
                  setIsMobileMenuOpen(false);
                }}
                className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 transition cursor-pointer shrink-0"
                title="MotoCare Portal"
              >
                <Wrench className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition cursor-pointer"
                title="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Icons Column */}
            <nav className="flex flex-col items-center gap-3 w-full mt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer group ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105'
                        : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    
                    {/* Desktop Tooltip */}
                    <span className="hidden md:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions: Profile, Settings & Logout */}
          <div className="flex flex-col items-center gap-2.5 w-full pt-4 border-t border-slate-100">
            <div
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer group relative"
              title={userProfile?.full_name || 'Account Profile'}
            >
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
              <span className="hidden md:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                {userProfile?.full_name || 'Account Profile'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer group relative"
              title="Account Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                Settings
              </span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer group relative"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
