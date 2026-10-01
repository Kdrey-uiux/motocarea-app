import { Menu, Bell, Search, ChevronDown, Wrench } from 'lucide-react';
import { TabType, ServiceTicket, UserProfile } from '../../types/dashboard';

interface DashboardHeaderProps {
  activeTab: TabType;
  setActiveTab?: (tab: TabType) => void;
  userProfile?: UserProfile | null;
  activeTickets: ServiceTicket[];
  onToggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
}

export default function DashboardHeader({
  activeTab,
  setActiveTab,
  userProfile,
  activeTickets,
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}: DashboardHeaderProps) {
  const navTabs = [
    { id: 'overview' as TabType, label: 'Dashboard' },
    { id: 'book' as TabType, label: 'Book Service' },
    { id: 'history' as TabType, label: 'Service Records' },
    { id: 'profile' as TabType, label: 'Account Profile' },
  ];

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      onToggleMobileMenu();
    } else {
      onToggleSidebarCollapse();
    }
  };

  return (
    <header className="sticky top-0 z-30 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-[2rem] px-4 sm:px-6 py-2.5 shadow-xs flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer md:hidden"
            title={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveTab && setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-xs">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight block">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </div>
        </div>

        {/* Center: Pill-shaped Nav Navigation Capsule (Matches Reference Image) */}
        <nav className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/60">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab && setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs scale-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Search, Notification Bell, User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            {activeTickets.length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white animate-pulse" />
            )}
          </div>

          {/* User Profile Pill Avatar */}
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('profile')}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:block text-xs font-semibold text-slate-800 max-w-[100px] truncate">
              {userProfile?.full_name?.split(' ')[0] || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
