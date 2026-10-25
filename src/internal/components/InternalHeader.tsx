import { useState, useRef, useEffect } from 'react';
import { 
  LogOut, 
  Menu, 
  Bell, 
  Check,
  ChevronDown,
  User,
  CheckCheck,
  Stamp,
  Sun,
  Moon,
  Monitor
} from '../../components/icons';
import { UserRole, NotificationAlert, InternalTab } from '../types/internal';
import type { ThemePreference } from '../../utils/theme';

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];
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
  themePreference?: ThemePreference;
  /** Whether dark is showing right now (for the quick moon/sun toggle) */
  isDarkTheme?: boolean;
  onChangeTheme?: (preference: ThemePreference) => void;
}

export default function InternalHeader({
  onLogout,
  onToggleMobileMenu,
  currentRole,
  currentUserName = 'Workshop Personnel',
  activeTab = 'dashboard',
  setActiveTab,
  notifications = [],
  onMarkNotificationRead,
  onClearNotifications,
  pendingHardcopyCount = 0,
  onOpenHardcopyModal,
  themePreference = 'system',
  isDarkTheme = false,
  onChangeTheme,
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
      {/* The strip around the floating header is filled with the page color (fading out at the bottom),
          so content scrolling underneath never peeks through above or beside it */}
      <header className="sticky top-0 z-30 pt-3 pb-2 px-3 sm:pt-4 sm:pb-3 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto bg-gradient-to-b from-page from-75% to-page/0 dark:from-page/50">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-[1.75rem] px-3.5 sm:px-5 py-2.5 card-elevated flex items-center justify-between gap-2 sm:gap-4 relative">
          
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
              <h1 className="font-display text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate leading-tight">
                <span className="sm:hidden">{INTERNAL_TAB_INFO[activeTab].shortTitle ?? INTERNAL_TAB_INFO[activeTab].title}</span>
                <span className="hidden sm:inline">{INTERNAL_TAB_INFO[activeTab].title}</span>
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 truncate">
                {INTERNAL_TAB_INFO[activeTab].subtitle}
              </p>
            </div>
          </div>

          {/* Right: Notifications, User Profile Pill & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* Hardcopy Certified Requests Quick Pill */}
            {typeof onOpenHardcopyModal === 'function' && (
              <button
                type="button"
                onClick={onOpenHardcopyModal}
                className={`relative h-9 w-9 sm:w-auto sm:px-3 rounded-full border text-sm font-medium transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  pendingHardcopyCount > 0
                    ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title="Customer requests for a certified hardcopy of their service records"
              >
                <Stamp className="w-4 h-4 text-orange-500" />
                <span className="hidden sm:inline">Hardcopies</span>
                {/* Count: a corner badge on phones, inline from tablet up */}
                {pendingHardcopyCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:static min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-5 px-1 sm:px-1.5 rounded-full bg-orange-500 border-2 border-white sm:border-0 text-white text-[10px] sm:text-[11px] font-semibold leading-[14px] sm:leading-5 text-center">
                    {pendingHardcopyCount}
                  </span>
                )}
              </button>
            )}

            {/* Phones: one round button that flips light / dark */}
            {onChangeTheme && (
              <button
                type="button"
                onClick={() => onChangeTheme(isDarkTheme ? 'light' : 'dark')}
                className="sm:hidden w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition cursor-pointer"
                aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDarkTheme ? 'Light mode' : 'Dark mode'}
              >
                {isDarkTheme ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Quick light / dark toggle (owner and staff); System lives in the account menu */}
            {onChangeTheme && (
              <div className="hidden sm:flex items-center h-9 p-0.5 rounded-full bg-slate-100 border border-slate-200" role="radiogroup" aria-label="Appearance">
                {([
                  { id: 'dark', label: 'Dark', icon: Moon, active: isDarkTheme },
                  { id: 'light', label: 'Light', icon: Sun, active: !isDarkTheme },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={option.active}
                    aria-label={option.label}
                    title={`${option.label} mode`}
                    onClick={() => onChangeTheme(option.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                      option.active ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen((prev) => !prev);
                  setIsUserMenuOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer relative"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 border-2 border-white text-white text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
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
                className="flex items-center gap-2 p-1 sm:pr-2.5 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
                title="Account menu"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center text-xs font-bold">
                  {userInitial}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <span className="text-sm font-medium text-slate-800 max-w-[110px] truncate block">
                    {currentUserName.split(' ')[0]}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {currentRole === 'admin' ? 'Owner' : 'Staff'}
                  </span>
                </div>
                <ChevronDown
                  className={`hidden sm:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isUserMenuOpen ? 'rotate-180 text-orange-500' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200/90 rounded-2xl sm:rounded-[1.75rem] shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {userInitial}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="text-sm font-semibold text-slate-900 truncate">{currentUserName}</div>
                      <div className="text-xs text-slate-500">{currentRole === 'admin' ? 'Shop owner' : 'Staff'}</div>
                    </div>
                  </div>

                  {/* Team is an owner-only page */}
                  {currentRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab?.('staff');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Team</span>
                    </button>
                  )}

                  {onChangeTheme && (
                    <div className="px-3 pt-1.5 pb-2">
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Appearance</p>
                      <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-slate-100" role="radiogroup" aria-label="Appearance">
                        {THEME_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isActive = themePreference === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              onClick={() => onChangeTheme(option.id)}
                              className={`flex items-center justify-center gap-1 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                                isActive ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
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
              <h3 className="font-display text-lg font-bold text-slate-900">Sign out?</h3>
              <p className="text-sm text-slate-500">You&apos;ll need to sign in again to use the console on this device.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 font-semibold text-white transition cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
