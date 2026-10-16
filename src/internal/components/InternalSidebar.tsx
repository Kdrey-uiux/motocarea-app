import {
  BellRing,
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
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { InternalTab, UserRole } from '../types/internal';
import { canAccessTab } from '../utils/permissions';

interface InternalSidebarProps {
  activeTab: InternalTab;
  setActiveTab: (tab: InternalTab) => void;
  queueCount: number;
  occupiedBaysCount: number;
  readyBillingCount: number;
  /** Conversations waiting for a reply from the shop */
  messagesCount: number;
  actionCount?: number;
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
  badgeColor?: string;
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
      className={`w-full h-10 px-3 rounded-xl flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer ${
        isActive
          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-[13px] font-semibold truncate">{item.label}</span>
      </span>
      {item.badge !== undefined && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
            isActive ? 'bg-white/25 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700'
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
  readyBillingCount,
  messagesCount,
  actionCount = 0,
  currentRole,
  currentUserName = 'Staff Member',
  onLogout,
  isMobileOpen,
  onCloseMobile,
}: InternalSidebarProps) {
  // Badges only for things that need attention (or quick capacity info)
  const allGroups: NavGroup[] = [
    {
      title: 'Daily Work',
      items: [
        {
          id: 'actions',
          label: 'Action Center',
          icon: BellRing,
          badge: actionCount > 0 ? actionCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          id: 'queue',
          label: 'Queue',
          icon: Inbox,
          badge: queueCount > 0 ? queueCount : undefined,
          badgeColor: 'bg-slate-100 text-slate-700',
        },
        {
          id: 'bays',
          label: 'Bays',
          icon: Wrench,
          badge: `${occupiedBaysCount}/10`,
          badgeColor: 'bg-slate-100 text-slate-700',
        },
        {
          id: 'billing',
          label: 'Counter Release',
          icon: ClipboardCheck,
          badge: readyBillingCount > 0 ? readyBillingCount : undefined,
          badgeColor: 'bg-emerald-500 text-white',
        },
        {
          id: 'messages',
          label: 'Messages',
          icon: MessageSquare,
          badge: messagesCount > 0 ? messagesCount : undefined,
          badgeColor: 'bg-sky-500 text-white',
        },
      ],
    },
    {
      title: 'Records',
      items: [
        { id: 'fleet', label: 'Vehicles', icon: Bike },
        { id: 'services', label: 'Services & Prices', icon: Layers },
      ],
    },
    {
      title: 'Owner',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'staff', label: 'Team', icon: Users },
        { id: 'audit', label: 'Activity Logs', icon: ShieldCheck },
      ],
    },
  ];
  const groups = allGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccessTab(currentRole, item.id)) }))
    .filter((group) => group.items.length > 0);

  const userInitial =
    currentRole === 'admin' ? 'A' : currentUserName ? currentUserName.trim().charAt(0).toUpperCase() : 'S';
  const roleLabel = currentRole === 'admin' ? 'Workshop Owner' : 'Staff Member';

  const renderNav = (onSelect: (tab: InternalTab) => void) => (
    <nav className="flex flex-col gap-5 w-full">
      {groups.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.title}</p>
          {group.items.map((item) => (
            <NavButton key={item.id} item={item} isActive={activeTab === item.id} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </nav>
  );

  const brand = (onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex items-center gap-3 cursor-pointer text-left">
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
    </button>
  );

  const userCard = (
    <div className="flex flex-col gap-2 w-full pt-4 border-t border-slate-100 shrink-0">
      <div className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
          {userInitial}
        </div>
        <div className="truncate flex-1">
          <div className="text-xs font-bold text-slate-900 truncate">{currentUserName}</div>
          <div className="text-[10px] text-orange-600 font-bold uppercase tracking-wider truncate">{roleLabel}</div>
        </div>
      </div>
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="w-full h-9 px-4 rounded-xl flex items-center justify-center gap-2 text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold text-xs"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (labeled, grouped) */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-60 p-4 bg-white border border-slate-200/80 rounded-[1.75rem] shadow-xs flex-col justify-between z-40">
        <div className="flex flex-col gap-6 w-full min-h-0">
          <div className="px-1 pt-1">{brand(() => setActiveTab('actions'))}</div>
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
                  setActiveTab('actions');
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
