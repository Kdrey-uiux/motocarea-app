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
  SignOutIcon,
  X,
  LucideIcon,
} from '../../components/icons';
import { InternalTab, UserRole } from '../types/internal';
import { canAccessTab } from '../utils/permissions';
import { useBayCount } from '../../utils/workshopBays';
import MotoCareLogo from '../../components/brand/MotoCareLogo';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

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
  onLogout?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  /** Desktop: slim icon-only rail instead of the full sidebar */
  isCollapsed?: boolean;
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
  collapsed = false,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (tab: InternalTab) => void;
  /** Icon-only rail: the badge becomes a corner bubble and the label a hover tooltip */
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
        className={`group relative w-11 h-11 mx-auto rounded-2xl flex items-center justify-center transition-colors duration-150 cursor-pointer ${
          isActive
            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-500/[0.07]'
        }`}
      >
        <Icon className="w-5 h-5" />
        {/* Only counts that need attention show on the rail (not the bay count) */}
        {item.badge !== undefined && item.badgeTone === 'alert' && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums ring-2 ring-white">
            {item.badge}
          </span>
        )}
      </button>
    );
  }

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
      <Badge item={item} />
    </button>
  );
}

function Badge({ item }: { item: NavItem }) {
  if (item.badge === undefined) return null;
  return (
    <span
      className={`min-w-[22px] px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums shrink-0 ${
        item.badgeTone === 'alert' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {item.badge}
    </span>
  );
}

/** Phone drawer row, same look as the rider menu: icon tile and label */
function DrawerButton({ item, isActive, onSelect }: { item: NavItem; isActive: boolean; onSelect: (tab: InternalTab) => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-3 transition cursor-pointer text-left ${
        isActive ? 'bg-orange-50' : 'hover:bg-slate-50'
      }`}
    >
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
          isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${isActive ? 'text-orange-700' : 'text-slate-900'}`}>
        {item.label}
      </span>
      <Badge item={item} />
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
  onLogout,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
}: InternalSidebarProps) {
  const bayCount = useBayCount();
  // The page behind the phone drawer stays still
  useLockBodyScroll(isMobileOpen);
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
          badge: `${occupiedBaysCount}/${bayCount}`,
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

  const selectFromDrawer = (tab: InternalTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* 1. DESKTOP SIDEBAR: full (labels, groups) or a slim icon rail when collapsed */}
      {isCollapsed ? (
        <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-[4.75rem] py-5 px-2 bg-white border border-slate-200/70 rounded-[1.75rem] card-elevated flex-col items-center z-40">
          <div className="flex flex-col items-center gap-5 w-full min-h-0">
            <button
              type="button"
              onClick={() => setActiveTab(homeTab)}
              className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 transition cursor-pointer shrink-0"
              title={currentRole === 'admin' ? 'Owner console' : 'Staff console'}
              aria-label="Go to dashboard"
            >
              <Wrench className="w-5 h-5" />
            </button>
            <nav className="flex flex-col items-center gap-3 w-full overflow-y-auto no-scrollbar min-h-0 pt-1">
              {groups.map((group, i) => (
                <div key={group.title} className={`flex flex-col gap-1.5 w-full ${i > 0 ? 'pt-3 border-t border-slate-100' : ''}`}>
                  {group.items.map((item) => (
                    <div key={item.id} title={item.badgeTone === 'info' ? `${item.label} · ${item.badge}` : item.label}>
                      <NavButton item={item} isActive={activeTab === item.id} onSelect={setActiveTab} collapsed />
                    </div>
                  ))}
                </div>
              ))}
            </nav>
          </div>
          {onLogout && (
            <div className="mt-auto pt-3 border-t border-slate-100 w-full flex justify-center shrink-0">
              <button
                type="button"
                onClick={onLogout}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <SignOutIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </aside>
      ) : (
        <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-60 p-4 bg-white border border-slate-200/70 rounded-[1.75rem] card-elevated flex-col z-40">
          <div className="flex flex-col gap-4 w-full min-h-0">
            <div className="px-1 pt-1">{brand(() => setActiveTab(homeTab))}</div>
            <div className="overflow-y-auto no-scrollbar min-h-0">{renderNav(setActiveTab)}</div>
          </div>
          {onLogout && (
            <div className="mt-auto pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onLogout}
                className="group w-full h-11 pl-1.5 pr-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <span className="w-8 h-8 rounded-[10px] bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors">
                  <SignOutIcon className="w-[18px] h-[18px]" />
                </span>
                Sign out
              </button>
            </div>
          )}
        </aside>
      )}

      {/* 2. PHONE / TABLET DRAWER (same design as the rider menu) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] h-[100dvh] bg-page rounded-r-[1.75rem] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:hidden overscroll-contain ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isMobileOpen}
        inert={!isMobileOpen}
      >
        {/* Soft orange fade, same as the rider menu */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 w-[24rem] h-[24rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.13)_0%,rgba(249,115,22,0)_65%)]"
        />

        <div className="relative flex-1 flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
          {/* Brand + close */}
          <div className="flex items-center justify-between shrink-0">
            {brand(() => selectFromDrawer(homeTab))}
            <button
              type="button"
              onClick={onCloseMobile}
              className="w-9 h-9 rounded-full bg-white border border-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* One card per group */}
          {groups.map((group) => (
            <div key={group.title} className="shrink-0">
              <p className="px-3 pb-1.5 text-xs font-medium text-slate-400">{group.title}</p>
              <nav className="bg-white rounded-2xl border border-slate-200/70 p-1.5">
                {group.items.map((item) => (
                  <DrawerButton key={item.id} item={item} isActive={activeTab === item.id} onSelect={selectFromDrawer} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        {onLogout && (
          <div className="relative shrink-0 p-4 pt-3 border-t border-slate-200/70">
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-11 rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <SignOutIcon className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
