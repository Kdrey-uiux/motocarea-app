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
  Clock,
  Stamp,
  FileText,
  BookOpen,
  CheckCheck
} from 'lucide-react';
import { TabType, ServiceTicket, UserProfile } from '../../types/dashboard';
import { HardcopyRequest } from '../../lib/hardcopyService';

interface DashboardHeaderProps {
  userId?: string | null;
  activeTab: TabType;
  setActiveTab?: (tab: TabType) => void;
  userProfile?: UserProfile | null;
  activeTickets: ServiceTicket[];
  serviceHistory?: ServiceTicket[];
  hardcopyRequests?: HardcopyRequest[];
  onToggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenSettings?: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  onOpenTutorial?: () => void;
}

export default function DashboardHeader({
  userId,
  activeTab,
  setActiveTab,
  userProfile,
  activeTickets,
  serviceHistory = [],
  hardcopyRequests = [],
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenSettings,
  onOpenPasswordModal,
  onLogout,
  onOpenTutorial,
}: DashboardHeaderProps) {
  // Only 3 Core Navigation Tabs (Eliminates redundant "Account Profile" in nav)
  const navTabs = [
    { id: 'overview' as TabType, label: 'Dashboard' },
    { id: 'book' as TabType, label: 'Book Service' },
    { id: 'history' as TabType, label: 'Service Records' },
  ];

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Persistent read tracking keyed by authenticated user ID
  const storageKey = userId ? `motocare_read_notifs_${userId}` : 'motocare_read_notifs_guest';
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Re-sync read state whenever account / userId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setReadNotifIds(saved ? JSON.parse(saved) : []);
    } catch {
      setReadNotifIds([]);
    }
  }, [storageKey]);

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

  // Dynamic Notifications with deterministic IDs & navigation targets
  const notificationsList = [
    ...(hardcopyRequests.length > 0
      ? hardcopyRequests
          .filter((hr) => hr.status === 'READY_FOR_PICKUP' || hr.status === 'PENDING')
          .map((hr) => {
            const isReady = hr.status === 'READY_FOR_PICKUP';
            return {
              id: `hardcopy-${hr.id}-${hr.status}`,
              title: isReady
                ? `Ready for Pickup: Certified Records (${hr.bikeModel})`
                : `Preparing Stamped Records: ${hr.bikeModel}`,
              desc: isReady
                ? `Your official certified copy (#${hr.id}) is stamped, signed, and waiting for you at the Santa Maria Front Desk Reception.`
                : `Your hardcopy request (#${hr.id}) has been submitted and is currently being processed by our Service Advisor.`,
              time: 'Front Desk Claim',
              isHighPriority: isReady,
              icon: isReady ? Stamp : FileText,
              color: isReady ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100',
              targetTab: 'history' as TabType,
            };
          })
      : []),
    ...(activeTickets.length > 0
      ? activeTickets.map((t) => {
          const isTicketReady = t.status === 'READY_FOR_PICKUP';
          return {
            id: `active-ticket-${t.id}-${t.status}-${t.stage}`,
            title: isTicketReady
              ? `Ready for Pickup: ${t.motorcycles?.model || 'Motorcycle'}`
              : `${t.motorcycles?.model || 'Motorcycle'}: Stage ${t.stage} Service`,
            desc: isTicketReady
              ? `Your ${t.motorcycles?.model || 'motorcycle'} (${t.motorcycles?.plate_number || 'Unit'}) has passed all tests and is ready at the workshop counter.`
              : `Your ${t.motorcycles?.model || 'motorcycle'} (${t.motorcycles?.plate_number || 'Unit'}) is currently in repair at ${t.assigned_bay || 'Service Bay'}.`,
            time: 'Live Workshop Alert',
            isHighPriority: isTicketReady,
            icon: isTicketReady ? CheckCircle2 : Wrench,
            color: isTicketReady ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50',
            targetTab: 'overview' as TabType,
          };
        })
      : []),
    ...(serviceHistory.length > 0
      ? [
          {
            id: `history-${serviceHistory[0].id || serviceHistory[0].ticket_code}`,
            title: 'Maintenance Log Verified',
            desc: `Service #${serviceHistory[0].ticket_code} (${serviceHistory[0].service_type}) completed and logged to your digital warranty.`,
            time: new Date(serviceHistory[0].created_at).toLocaleDateString(),
            isHighPriority: false,
            icon: ShieldCheck,
            color: 'text-blue-600 bg-blue-50',
            targetTab: 'history' as TabType,
          },
        ]
      : []),
    {
      id: 'general-welcome-guarantee',
      title: 'Workshop Guarantee Active',
      desc: 'All reservations enjoy our 7-day labor warranty and zero-advance-deposit policy.',
      time: 'MotoCare Policy',
      isHighPriority: false,
      icon: Clock,
      color: 'text-slate-600 bg-slate-100',
      targetTab: 'settings' as TabType,
    },
  ];

  // Calculate unread count strictly based on persistent read notification IDs
  const unreadCount = notificationsList.filter((notif) => !readNotifIds.includes(notif.id)).length;
  const hasUnreadNotifications = unreadCount > 0;

  const handleMarkAllAsRead = () => {
    const allIds = notificationsList.map((n) => n.id);
    const merged = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(merged);
    try {
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to save read notifications:', e);
    }
  };

  const handleNotificationClick = (notif: typeof notificationsList[0]) => {
    if (!readNotifIds.includes(notif.id)) {
      const merged = Array.from(new Set([...readNotifIds, notif.id]));
      setReadNotifIds(merged);
      try {
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to save read notification:', e);
      }
    }
    if (notif.targetTab && setActiveTab) {
      setActiveTab(notif.targetTab);
      setIsNotificationsOpen(false);
    }
  };

  return (
    <header
      className={`z-30 bg-[#f2f4f7]/95 backdrop-blur-md transition-all duration-300 sticky top-0 md:fixed md:top-0 md:right-0 ${
        isSidebarCollapsed ? 'md:left-0' : 'md:left-24'
      }`}
    >
      <div className="max-w-7xl mx-auto w-full pt-2.5 pb-2 px-3 sm:pt-4 sm:pb-3 sm:px-6 lg:px-8">
        <div id="tour-header-bar" className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[2rem] px-3.5 sm:px-6 py-2 sm:py-2.5 shadow-xs flex items-center justify-between gap-2 sm:gap-4 relative">
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
        <nav id="tour-nav-tabs" className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/60 absolute left-1/2 -translate-x-1/2">
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
          {/* Quick Tutorial Launch Button */}
          {onOpenTutorial && (
            <button
              id="tour-user-guide"
              type="button"
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 text-xs font-bold transition shadow-2xs cursor-pointer group active:scale-95"
              title="User Guide & System Walkthrough"
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-500 group-hover:scale-105 transition-transform" />
              <span className="hidden sm:inline">User Guide</span>
            </button>
          )}

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
                      {hasUnreadNotifications ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                          {unreadCount} New
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-500" /> All caught up
                        </span>
                      )}
                    </div>
                    {hasUnreadNotifications && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer transition active:scale-95"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notificationsList.map((notif) => {
                      const Icon = notif.icon;
                      const isUnread = !readNotifIds.includes(notif.id);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 rounded-2xl border transition text-xs space-y-1 cursor-pointer ${
                            isUnread
                              ? notif.isHighPriority
                                ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                                : 'bg-white border-orange-200 shadow-2xs hover:border-orange-300'
                              : 'bg-slate-50/50 border-slate-100/90 text-slate-500 opacity-75 hover:opacity-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-xl ${notif.color} shrink-0 mt-0.5`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`block truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                  {notif.title}
                                </span>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Unread" />
                                )}
                              </div>
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

                {onOpenTutorial && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenTutorial();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-orange-700 bg-orange-50/60 hover:bg-orange-100/80 rounded-xl transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-orange-500" />
                    <span>User Guide & Onboarding</span>
                  </button>
                )}

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
      </div>
    </header>
  );
}
