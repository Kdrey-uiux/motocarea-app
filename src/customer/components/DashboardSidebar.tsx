import { TabType, UserProfile } from '../../types/dashboard';
import {
  Wrench,
  LayoutDashboard,
  History,
  Calendar,
  User,
  LogOut,
  X
} from 'lucide-react';

interface DashboardSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  userProfile,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: DashboardSidebarProps) {
  const navItems = [
    { id: 'overview' as TabType, label: 'Overview & Tracker', icon: LayoutDashboard },
    { id: 'book' as TabType, label: 'Book Service', icon: Calendar },
    { id: 'history' as TabType, label: 'Service Records', icon: History },
    { id: 'profile' as TabType, label: 'Account Profile', icon: User },
  ];

  return (
    <>
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 h-screen shadow-lg md:shadow-none transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 leading-tight block">
                  Moto<span className="text-blue-600">Care</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Customer Portal</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {userProfile?.full_name}
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono">
                  {userProfile?.phone_number}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
