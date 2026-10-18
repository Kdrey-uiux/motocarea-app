import { useState, useRef, useEffect } from 'react';
import { 
  LogOut, 
  Menu, 
  Bell, 
  Check,
  ChevronDown,
  User,
  CheckCheck,
  Stamp
} from 'lucide-react';
import { UserRole, NotificationAlert, InternalTab } from '../types/internal';
import { INTERNAL_TAB_INFO } from '../utils/tabTitles';

interface InternalHeaderProps {
  loading?: boolean;
  onRefresh?: () => void;
  onLogout: () => void;
  onToggleMobileMenu: () => void;
  currentRole: UserRole;
  currentUserName?: string;
  activeTab?: InternalTab;
  setActiveTab?: (tab: InternalTab) => void;
  notifications?: NotificationAlert[];
  onMarkNotificationRead?: (id: string) => void;
  onClearNotifications?: () => void;
  pendingHardcopyCount?: number;
  onOpenHardcopyModal?: () => void;
}

export default function InternalHeader({
  onLogout,
  onToggleMobileMenu,
  currentRole,
  currentUserName = 'Workshop Personnel',
  activeTab = 'actions',
  setActiveTab,
  notifications = [],
  onMarkNotificationRead,
  onClearNotifications,
  pendingHardcopyCount = 0,
  onOpenHardcopyModal,
}: InternalHeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const userInitial = currentUserName ? currentUserName.trim().charAt(0).toUpperCase() : currentRole === 'admin' ? 'A' : 'S';

  return (
    <>
      <header className="sticky top-0 z-30 pt-3 pb-2 px-3 sm:pt-4 sm:pb-3 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[2rem] px-3.5 sm:px-6 py-2.5 shadow-xs flex items-center justify-between gap-2 sm:gap-4 relative">
          
          {/* Left: mobile menu toggle + current page title (brand lives in the sidebar) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 pl-1">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                {INTERNAL_TAB_INFO[activeTab].title}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">
                {INTERNAL_TAB_INFO[activeTab].subtitle}
              </p>
            </div>
          </div>

          {/* Right: Notifications, User Profile Pill & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Hardcopy Certified Requests Quick Pill */}
            {typeof onOpenHardcopyModal === 'function' && (
              <button
                type="button"
                onClick={onOpenHardcopyModal}
                className={`relative px-3 py-1.5 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  pendingHardcopyCount > 0
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                }`}
                title="View customer certified hardcopy maintenance record requests"
              >
                <Stamp className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline">Hardcopies</span>
                {pendingHardcopyCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-black">
                    {pendingHardcopyCount}
                  </span>
                )}
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen((prev) => !prev);
                  setIsUserMenuOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer relative"
                title="Floor Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl sm:rounded-[1.75rem] shadow-xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-slate-900">Floor Notifications</h4>
                      {unreadCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                          {unreadCount} New
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-500" /> All caught up
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && onClearNotifications && (
                      <button
                        type="button"
                        onClick={onClearNotifications}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-center py-5 text-xs text-slate-400">
                        No new alerts. Floor queue is running smoothly.
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 transition ${
                            notif.read
                              ? 'bg-slate-50/60 border-slate-100 text-slate-500'
                              : 'bg-orange-50/60 border-orange-200/80 text-slate-800 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-[11px]">{notif.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed">{notif.message}</p>
                          {!notif.read && onMarkNotificationRead && (
                            <button
                              type="button"
                              onClick={() => onMarkNotificationRead(notif.id)}
                              className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Mark as read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic User Profile Pill */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen((prev) => !prev);
                  setIsNotifOpen(false);
                }}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition cursor-pointer"
                title="User Profile Menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {userInitial}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-semibold text-slate-800 max-w-[110px] truncate block leading-tight">
                    {currentUserName.split(' ')[0]}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                    currentRole === 'admin' ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {currentRole === 'admin' ? 'ADMIN' : 'STAFF'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isUserMenuOpen ? 'rotate-180 text-orange-500' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200/90 rounded-2xl sm:rounded-[1.75rem] shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                      {userInitial}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {currentUserName}
                      </div>
                      <div className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">
                        {currentRole === 'admin' ? 'Workshop Administrator' : 'Service Staff'}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Access Level</span>
                      <strong className="text-slate-800 uppercase">{currentRole}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Workshop Mode</span>
                      <strong className="text-slate-800">Live Floor</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab?.('staff');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-orange-500" />
                    <span>Team Management</span>
                  </button>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Sign Out of Workshop Console?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to end your active session on this terminal?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 font-bold text-white transition cursor-pointer shadow-xs"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
