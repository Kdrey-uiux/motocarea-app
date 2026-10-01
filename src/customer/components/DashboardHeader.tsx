import { Menu, Bell, Plus } from 'lucide-react';
import { TabType, ServiceTicket } from '../../types/dashboard';

interface DashboardHeaderProps {
  activeTab: TabType;
  activeTickets: ServiceTicket[];
  onBookClick: () => void;
  onToggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
}

export default function DashboardHeader({
  activeTab,
  activeTickets,
  onBookClick,
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}: DashboardHeaderProps) {
  const titles: Record<TabType, string> = {
    overview: 'Dashboard',
    book: 'Book Service',
    history: 'Service Records',
    messages: 'Workshop Helpdesk',
    profile: 'Account Profile',
  };

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      onToggleMobileMenu();
    } else {
      onToggleSidebarCollapse();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Single clean sidebar toggle button (Mobile & Desktop) */}
          <button
            type="button"
            onClick={handleToggle}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center justify-center"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {titles[activeTab] || 'Dashboard'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            {activeTickets.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white">
                {activeTickets.length}
              </span>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onBookClick}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Service</span>
          </button>
        </div>
      </div>
    </header>
  );
}
