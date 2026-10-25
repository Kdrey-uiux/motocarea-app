import {
  LayoutGrid,
  Inbox,
  Wrench,
  MessageSquare,
  Bike,
  Layers,
  Users,
  ShieldCheck,
  Star,
  X,
  LogOut,
  LucideIcon,
} from '../../components/icons';
import { InternalTab, UserRole } from '../types/internal';
import { canAccessTab } from '../utils/permissions';
import { WORKSHOP_BAY_COUNT } from '../utils/bays';
import MotoCareLogo from '../../components/brand/MotoCareLogo';

interface InternalSidebarProps {
  activeTab: InternalTab;
  setActiveTab: (tab: InternalTab) => void;
  queueCount: number;
  occupiedBaysCount: number;
  /** Conversations waiting for a reply from the shop */
  messagesCount: number;
  /** Reviews waiting for approval */
  pendingReviewsCount?: number;
  currentRole: UserRole;
  currentUserName?: string;
  onLogout?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: InternalTab;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  /** 'alert' = needs attention (orange), 'info' = just a count (gray) */
  badgeTone?: 'alert' | 'info';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function NavButton({
  item,
  isActive,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (tab: InternalTab) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={isActive ? 'page' : undefined}
      className={`relative w-full h-11 pl-1.5 pr-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer ${
        isActive
          ? 'bg-slate-500/[0.12] text-slate-900'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-500/[0.07]'
      }`}
    >
      {/* iOS Settings style: the filled icon sits in a small rounded tile (orange when active) */}
      <span className="flex items-center gap-3 min-w-0">
        <span
          className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
            isActive ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <span className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
      </span>
      {item.badge !== undefined && (
        <span
          className={`min-w-[22px] px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums shrink-0 ${
            item.badgeTone === 'alert' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

export default function InternalSidebar({
  activeTab,
  setActiveTab,
  queueCount,
  occupiedBaysCount,
  messagesCount,
  pendingReviewsCount = 0,
  currentRole,
  currentUserName = 'Staff Member',
  onLogout,
  isMobileOpen,
  onCloseMobile,
}: InternalSidebarProps) {
  // Badges only for things that need attention (or quick capacity info)
  const allGroups: NavGroup[] = [
    {
      title: 'Daily work',
      items: [
        // Home tab for owner and staff
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        {
          id: 'queue',
          label: 'Queue',
          icon: Inbox,
          badge: queueCount > 0 ? queueCount : undefined,
          badgeTone: 'alert',
        },
        {
          id: 'bays',
          label: 'Bays',
          icon: Wrench,
          badge: `${occupiedBaysCount}/${WORKSHOP_BAY_COUNT}`,
          badgeTone: 'info',
        },
        {
          id: 'messages',
          label: 'Messages',
          icon: MessageSquare,
          badge: messagesCount > 0 ? messagesCount : undefined,
          badgeTone: 'alert',
        },
        {
          id: 'reviews',
          label: 'Reviews',
          icon: Star,
          badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
          badgeTone: 'alert',
        },
      ],
    },
    {
      title: 'Records',
      items: [
        { id: 'fleet', label: 'Vehicles', icon: Bike },
        { id: 'services', label: 'Services', icon: Layers },
      ],
    },
    {
      title: 'Owner',
      items: [
        { id: 'staff', label: 'Team', icon: Users },
        { id: 'audit', label: 'Activity Logs', icon: ShieldCheck },
      ],
    },
  ];
  const groups = allGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccessTab(currentRole, item.id)) }))
    .filter((group) => group.items.length > 0);

  const userInitial =
    currentUserName ? currentUserName.trim().charAt(0).toUpperCase() : currentRole === 'admin' ? 'A' : 'S';
  const roleLabel = currentRole === 'admin' ? 'Shop owner' : 'Staff';
  const homeTab: InternalTab = 'dashboard';

  const renderNav = (onSelect: (tab: InternalTab) => void) => (
    <nav className="flex flex-col gap-5 w-full">
      {groups.map((group) => (
        <div key={group.title} className="space-y-0.5">
          <p className="px-3 pb-1 text-xs font-medium text-slate-400">{group.title}</p>
          {group.items.map((item) => (
            <NavButton key={item.id} item={item} isActive={activeTab === item.id} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </nav>
  );

  const brand = (onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex items-center gap-3 cursor-pointer text-left">
      <div>
        <MotoCareLogo className="h-12 w-auto text-slate-900" />
        <span className="text-xs text-slate-400 block mt-0.5">
          {currentRole === 'admin' ? 'Owner console' : 'Staff console'}
        </span>
      </div>
    </button>
  );

  const userCard = (
    <div className="w-full pt-3 border-t border-slate-100 shrink-0">
      <div className="w-full p-2 rounded-2xl bg-slate-50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
          {userInitial}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-semibold text-slate-900 truncate">{currentUserName}</div>
          <div className="text-xs text-slate-500 truncate">{roleLabel}</div>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (labeled, grouped) */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-60 p-4 bg-white border border-slate-200/70 rounded-[1.75rem] card-elevated flex-col justify-between z-40">
        <div className="flex flex-col gap-4 w-full min-h-0">
          <div className="px-1 pt-1">{brand(() => setActiveTab(homeTab))}</div>
          <div className="overflow-y-auto no-scrollbar min-h-0">{renderNav(setActiveTab)}</div>
        </div>
        {userCard}
      </aside>

      {/* 2. MOBILE SLIDE-OVER DRAWER (lg:hidden) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 sm:w-80 max-w-[85vw] h-[100dvh] bg-white shadow-2xl flex flex-col justify-between p-4 sm:p-5 border-r border-slate-100 z-50 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-5 w-full overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between w-full shrink-0 pb-3 border-b border-slate-100">
                {brand(() => {
                  setActiveTab(homeTab);
                  onCloseMobile();
                })}
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderNav((tab) => {
                setActiveTab(tab);
                onCloseMobile();
              })}
            </div>
            {userCard}
          </div>
        </div>
      )}
    </>
  );
}
