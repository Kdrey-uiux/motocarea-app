import { 
  LayoutGrid,
  Inbox, 
  Wrench, 
  ClipboardCheck, 
  MessageSquare, 
  Bike, 
  Layers, 
  Users, 
  ShieldCheck, 
  X,
  LogOut
} from 'lucide-react';
import { InternalTab, UserRole } from '../types/internal';
import { canAccessTab } from '../utils/permissions';

interface InternalSidebarProps {
  activeTab: InternalTab;
  setActiveTab: (tab: InternalTab) => void;
  queueCount: number;
  occupiedBaysCount: number;
  readyBillingCount: number;
  messagesCount: number;
  fleetCount: number;
  staffCount: number;
  currentRole: UserRole;
  currentUserName?: string;
  onLogout?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function InternalSidebar({
  activeTab,
  setActiveTab,
  queueCount,
  occupiedBaysCount,
  readyBillingCount,
  messagesCount,
  fleetCount,
  staffCount,
  currentRole,
  currentUserName = 'Staff Member',
  onLogout,
  isMobileOpen,
  onCloseMobile,
}: InternalSidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as InternalTab,
      label: 'Dashboard',
      icon: LayoutGrid,
      adminOnly: true,
    },
    {
      id: 'queue' as InternalTab,
      label: 'Queue',
      icon: Inbox,
      badge: queueCount > 0 ? queueCount : undefined,
      badgeColor: 'bg-orange-500 text-white',
      adminOnly: false,
    },
    {
      id: 'bays' as InternalTab,
      label: 'Bays',
      icon: Wrench,
      badge: occupiedBaysCount > 0 ? `${occupiedBaysCount}/10` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      adminOnly: false,
    },
    {
      id: 'billing' as InternalTab,
      label: 'Counter Release',
      icon: ClipboardCheck,
      badge: readyBillingCount > 0 ? readyBillingCount : undefined,
      badgeColor: 'bg-orange-500 text-white animate-pulse',
      adminOnly: false,
    },
    {
      id: 'messages' as InternalTab,
      label: 'Messages',
      icon: MessageSquare,
      badge: messagesCount > 0 ? messagesCount : undefined,
      badgeColor: 'bg-blue-500 text-white',
      adminOnly: false,
    },
    {
      id: 'fleet' as InternalTab,
      label: 'Vehicles',
      icon: Bike,
      badge: fleetCount > 0 ? fleetCount : undefined,
      badgeColor: 'bg-slate-700 text-white',
      adminOnly: false,
    },
    {
      id: 'services' as InternalTab,
      label: 'Services',
      icon: Layers,
      adminOnly: false,
    },
    // Admin Exclusive Operations
    {
      id: 'staff' as InternalTab,
      label: 'Team',
      icon: Users,
      badge: staffCount > 0 ? staffCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
      adminOnly: true,
    },
    {
      id: 'audit' as InternalTab,
      label: 'Activity Logs',
      icon: ShieldCheck,
      adminOnly: true,
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return canAccessTab(currentRole, item.id);
    }
    return true;
  });

  const userInitial = currentRole === 'admin' ? 'A' : (currentUserName ? currentUserName.trim().charAt(0).toUpperCase() : 'S');

  return (
    <>
      {/* 1. DESKTOP FLOATING SLIM DOCK (hidden below lg) */}
      <aside className="hidden lg:flex fixed left-5 top-4 bottom-4 w-20 py-6 px-2.5 bg-white border border-slate-200/80 rounded-[2rem] shadow-xs flex-col justify-between items-center z-40">
        
        {/* Top Brand Squircle Icon */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div
            onClick={() => setActiveTab(currentRole === 'admin' ? 'dashboard' : 'queue')}
            className="flex items-center justify-center cursor-pointer"
            title="MotoCare Workshop Floor"
          >
            <div className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 transition shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          {/* Navigation Icon Buttons with Hover Tooltips */}
          <nav className="flex flex-col items-center gap-2 w-full mt-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer group relative ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 shrink-0" />

                  {/* Badge Counter */}
                  {item.badge !== undefined && (
                    <span className={`absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white shadow-xs ${
                      item.badgeColor || 'bg-orange-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Dark Floating Tooltip */}
                  <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: User Initial Avatar & Logout */}
        <div className="flex flex-col items-center gap-2.5 w-full pt-4 border-t border-slate-100">
          {/* User Initial Avatar Pill */}
          <div
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs group relative cursor-default"
            title={currentRole === 'admin' ? 'Admin (Administrator)' : `${currentUserName} (${currentRole.toUpperCase()})`}
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {userInitial}
            </div>

            {/* Tooltip */}
            <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-md z-50 pointer-events-none">
              {currentRole === 'admin' ? 'Admin' : currentUserName} ({currentRole === 'admin' ? 'Administrator' : 'Staff'})
            </span>
          </div>

          {/* Logout Icon Button */}
          {onLogout && (
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
          )}
        </div>
      </aside>

      {/* 2. MOBILE SLIDE-OVER DRAWER (lg:hidden) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />

          {/* Slide-over Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 sm:w-80 max-w-[85vw] h-[100dvh] bg-white shadow-2xl flex flex-col justify-between p-4 sm:p-5 border-r border-slate-100 z-50 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-4 w-full overflow-y-auto no-scrollbar">
              {/* Drawer Header */}
              <div className="flex items-center justify-between w-full shrink-0 pb-3 border-b border-slate-100">
                <div
                  onClick={() => {
                    setActiveTab(currentRole === 'admin' ? 'dashboard' : 'queue');
                    onCloseMobile();
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
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      {currentRole === 'admin' ? 'Owner Console' : 'Staff Console'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items List */}
              <nav className="flex flex-col gap-1.5 w-full">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full h-11 px-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1.5 shrink-0 ${
                            isActive
                              ? 'bg-white/25 text-white'
                              : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom User Card & Logout in Mobile Drawer */}
            <div className="flex flex-col gap-2.5 w-full pt-4 border-t border-slate-100 shrink-0">
              <div className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {userInitial}
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentUserName}
                  </div>
                  <div className="text-[10px] text-orange-600 font-bold uppercase tracking-wider truncate">
                    {currentRole === 'admin' ? 'Workshop Owner' : 'Staff Member'}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full h-10 px-4 rounded-2xl flex items-center justify-center gap-2 text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold text-xs"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
