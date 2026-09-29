import { 
  ClipboardList, 
  Wrench, 
  ShieldCheck, 
  BarChart3, 
  Bike, 
  MessageSquare, 
  Layers, 
  X,
  Radio,
  UserCheck,
  Users
} from 'lucide-react';
import { AdminTab, UserRole } from '../types/admin';
import { canAccessTab } from '../utils/permissions';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  queueCount: number;
  occupiedBaysCount: number;
  auditCount: number;
  fleetCount: number;
  messagesCount: number;
  staffCount?: number;
  currentRole?: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  queueCount,
  occupiedBaysCount,
  auditCount,
  fleetCount,
  messagesCount,
  staffCount = 0,
  currentRole = 'admin',
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const allNavItems: Array<{
    id: AdminTab;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'queue',
      label: 'Service Queue & Dispatch',
      sublabel: 'Active intake & progress',
      icon: ClipboardList,
      badge: queueCount,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'bays',
      label: 'Workshop Bays',
      sublabel: 'Bays 01-04 Floor Plan',
      icon: Wrench,
      badge: `${occupiedBaysCount}/4`,
      badgeColor: occupiedBaysCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200',
    },
    {
      id: 'audit',
      label: 'Audit Trail & Logs',
      sublabel: 'Immutable history logs',
      icon: ShieldCheck,
      badge: auditCount,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'staff',
      label: 'Staff & Personnel',
      sublabel: 'Accounts & access status',
      icon: Users,
      badge: staffCount > 0 ? `${staffCount} Staff` : undefined,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'analytics',
      label: 'Workshop Analytics',
      sublabel: 'Revenue, pipeline & stats',
      icon: BarChart3,
    },
    {
      id: 'fleet',
      label: 'Customer Fleet Directory',
      sublabel: 'All registered motorbikes',
      icon: Bike,
      badge: fleetCount,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      id: 'messages',
      label: 'Helpdesk & Rider Chat',
      sublabel: 'Direct workshop messaging',
      icon: MessageSquare,
      badge: messagesCount > 0 ? messagesCount : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    },
    {
      id: 'services',
      label: 'Service Rates & Menu',
      sublabel: 'Labor guide & checklists',
      icon: Layers,
    },
  ];

  // Salain ang tabs base sa role: kung 'staff', itago ang 'analytics'
  const visibleNavItems = allNavItems.filter((item) => canAccessTab(currentRole, item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-[65px] left-0 z-50 md:z-20 h-full md:h-[calc(100vh-65px)] w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xs ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mobile Close Header */}
          <div className="flex items-center justify-between md:hidden pb-3 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Navigation Menu
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Label */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Workshop Management
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                currentRole === 'staff'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {currentRole === 'staff' ? 'Staff Level' : 'Admin Level'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs truncate font-medium">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Operational Status Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-800">
                Operations Console Live
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <UserCheck className="w-3 h-3 text-blue-600" />
              <span className="capitalize">{currentRole}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 space-y-0.5">
            <div>Scope: {currentRole === 'staff' ? 'Queue & Floor Dispatch (No Analytics)' : 'Full Operations & Revenue'}</div>
            <div>Shift: Morning – Evening Active</div>
            <div className="text-blue-600 font-medium">Supabase Realtime Synced</div>
          </div>
        </div>
      </aside>
    </>
  );
}
