import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  ChevronDown,
  Wrench,
  User,
  ShieldCheck,
  Key,
  LogOut,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { TabType, ServiceTicket, UserProfile } from '../../types/dashboard';

interface DashboardHeaderProps {
  activeTab: TabType;
  setActiveTab?: (tab: TabType) => void;
  userProfile?: UserProfile | null;
  activeTickets: ServiceTicket[];
  serviceHistory?: ServiceTicket[];
  onToggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenSettings?: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({
  activeTab,
  setActiveTab,
  userProfile,
  activeTickets,
  serviceHistory = [],
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenSettings,
  onOpenPasswordModal,
  onLogout,
}: DashboardHeaderProps) {
  // Only 3 Core Navigation Tabs (Eliminates redundant "Account Profile" in nav)
  const navTabs = [
    { id: 'overview' as TabType, label: 'Dashboard' },
    { id: 'book' as TabType, label: 'Book Service' },
    { id: 'history' as TabType, label: 'Service Records' },
  ];

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      onToggleMobileMenu();
    } else {
      onToggleSidebarCollapse();
    }
  };

  const activeTicket = activeTickets.length > 0 ? activeTickets[0] : null;
  const isReady = activeTicket?.status === 'READY_FOR_PICKUP';

  // Dynamic Notifications based on user DB state
  const notificationsList = [
    ...(activeTicket
      ? [
          {
            id: 'active-ticket',
            title: isReady ? 'Vehicle Ready for Pickup!' : `Service in Progress: Stage ${activeTicket.stage}`,
            desc: isReady
              ? `Your ${activeTicket.motorcycles?.model || 'motorcycle'} has passed all road tests and is ready at the workshop counter.`
              : `Your ${activeTicket.motorcycles?.model || 'motorcycle'} is currently in repair at ${activeTicket.assigned_bay || 'Service Bay'}.`,
            time: 'Live Workshop Alert',
            isHighPriority: isReady,
            icon: isReady ? CheckCircle2 : Wrench,
            color: isReady ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50',
          },
        ]
      : []),
    ...(serviceHistory.length > 0
      ? [
          {
            id: 'last-completed',
            title: 'Maintenance Log Verified',
            desc: `Service #${serviceHistory[0].ticket_code} (${serviceHistory[0].service_type}) completed and logged to your digital warranty.`,
            time: new Date(serviceHistory[0].created_at).toLocaleDateString(),
            isHighPriority: false,
            icon: ShieldCheck,
            color: 'text-blue-600 bg-blue-50',
          },
        ]
      : []),
    {
      id: 'general-welcome',
      title: 'Workshop Guarantee Active',
      desc: 'All reservations enjoy our 7-day labor warranty and zero-advance-deposit policy.',
      time: 'MotoCare Policy',
      isHighPriority: false,
      icon: Clock,
      color: 'text-slate-600 bg-slate-100',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#f2f4f7]/95 backdrop-blur-md pt-2.5 pb-2 px-3 sm:pt-4 sm:pb-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[2rem] px-3.5 sm:px-6 py-2 sm:py-2.5 shadow-xs flex items-center justify-between gap-2 sm:gap-4 relative">
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

        {/* Center: Clean 3-Tab Pill Navigation (Exactly Centered in Desktop Header) */}
        <nav className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/60 absolute left-1/2 -translate-x-1/2">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab && setActiveTab(tab.id)}
                className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
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

        {/* Right: Functional Notification Bell & Interactive "K" Avatar Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Functional Notification Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                setIsUserMenuOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {hasUnreadNotifications && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white animate-pulse" />
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotificationsOpen && (
              <>
                {/* Mobile Backdrop (Transparent click-catcher, does not darken top header) */}
                <div
                  className="fixed inset-0 z-40 sm:hidden"
                  onClick={() => setIsNotificationsOpen(false)}
                />
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-h-[82vh] flex flex-col bg-white border border-slate-200/90 rounded-2xl sm:rounded-[1.75rem] shadow-2xl sm:shadow-xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900">Notifications</h4>
                      {hasUnreadNotifications && (
                        <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                          New
                        </span>
                      )}
                    </div>
                    {hasUnreadNotifications && (
                      <button
                        type="button"
                        onClick={() => setHasUnreadNotifications(false)}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notificationsList.map((notif) => {
                    const Icon = notif.icon;
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-2xl border transition text-xs space-y-1 ${
                          notif.isHighPriority
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-xl ${notif.color} shrink-0 mt-0.5`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {notif.title}
                            </span>
                            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                              {notif.desc}
                            </p>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {notif.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Interactive User "K" Avatar Dropdown Menu (Universal Account Menu) */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsUserMenuOpen((prev) => !prev);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition cursor-pointer"
            title="User Account Menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'K'}
            </div>
            <span className="hidden sm:block text-xs font-semibold text-slate-800 max-w-[100px] truncate">
              {userProfile?.full_name?.split(' ')[0] || 'Account'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isUserMenuOpen ? 'rotate-180 text-orange-500' : ''
              }`}
            />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              {/* Mobile Backdrop (Transparent click-catcher, does not darken top header) */}
              <div
                className="fixed inset-0 z-40 sm:hidden"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200/90 rounded-2xl sm:rounded-[1.75rem] shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {/* Header Profile Identity */}
                <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                    {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'K'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {userProfile?.full_name || 'Rider Customer'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {userProfile?.email || userProfile?.phone_number || 'MotoCare Member'}
                    </div>
                  </div>
                </div>

                {/* Dropdown Options */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setActiveTab && setActiveTab('profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-orange-500" />
                  <span>Account Profile & Garage</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (setActiveTab) {
                      setActiveTab('settings');
                    } else if (onOpenSettings) {
                      onOpenSettings();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>Settings & Policies</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenPasswordModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <Key className="w-4 h-4 text-slate-400" />
                  <span>Change Password</span>
                </button>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
