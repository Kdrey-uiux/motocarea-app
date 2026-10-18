import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { isAwaitingArrival } from '../utils/ticketActions';
import { toast } from '../utils/toast';
import { useNow } from '../hooks/useNow';
import { InternalTicket, InternalStaffMember, UserRole, InternalTab } from '../types/internal';
import { 
  Plus, 
  ArrowUpRight, 
  Wrench, 
  Calendar, 
  CheckCircle2, 
  Activity, 
  Bike, 
  Clock, 
  KeyRound,
  Users,
  Star
} from 'lucide-react';
import {
  getDailyCapacityLimit
} from '../../utils/workshopCapacity';
import NewWalkInTicketModal from '../modals/NewWalkInTicketModal';
import { normalizeBayNumber } from '../utils/bays';

// ============================================================================
// TypeScript Interfaces (Strict Mode)
// ============================================================================

export interface DashboardKPIs {
  activeBikesOnFloor: number;
  completedToday: number;
  readyForRelease: number;
  bayUtilizationText: string;
  bayUtilizationPct: number;
  periodLabel?: string;
  periodSubtext?: string;
}

const BAY_MAINTENANCE_KEY = 'motocare_bay_maintenance_flags';

const OFFICIAL_BAYS = [
  { id: 'bay-1', searchKey: 'bay 01', bayNumber: 1, name: 'Bay 01', title: 'Quick Service & Oil Express' },
  { id: 'bay-2', searchKey: 'bay 02', bayNumber: 2, name: 'Bay 02', title: 'CVT Cleaning & Tuning' },
  { id: 'bay-3', searchKey: 'bay 03', bayNumber: 3, name: 'Bay 03', title: 'Engine Overhaul & Heavy Repair' },
  { id: 'bay-4', searchKey: 'bay 04', bayNumber: 4, name: 'Bay 04', title: 'Electrical & Wiring Lab' },
  { id: 'bay-5', searchKey: 'bay 05', bayNumber: 5, name: 'Bay 05', title: 'Brakes & Suspension' },
  { id: 'bay-6', searchKey: 'bay 06', bayNumber: 6, name: 'Bay 06', title: 'FI Cleaning & Calibration' },
  { id: 'bay-7', searchKey: 'bay 07', bayNumber: 7, name: 'Bay 07', title: 'Tires & Wheel Alignment' },
  { id: 'bay-8', searchKey: 'bay 08', bayNumber: 8, name: 'Bay 08', title: 'General Mechanical' },
  { id: 'bay-9', searchKey: 'bay 09', bayNumber: 9, name: 'Bay 09', title: 'Major Body & Chassis' },
  { id: 'bay-10', searchKey: 'bay 10', bayNumber: 10, name: 'Bay 10', title: 'Final Testing & Quality Check' },
];

export interface ActiveFloorTicket {
  id: string;
  ticket_code: string;
  model: string;
  plate_number: string;
  bay: string;
  assigned_mechanic: string;
  elapsed_time: string;
  stage: number;
  statusText: string;
  isOverdue?: boolean;
}

export interface TechnicianStatus {
  id: string;
  name: string;
  position: string;
  isAvailable: boolean;
  assignedBay?: string;
  completedJobsToday: number;
}

export interface BayStatus {
  id: string;
  bayNumber: number;
  name: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  bikeModel?: string | null;
  plateNumber?: string | null;
  stage?: number;
  mechanic?: string | null;
}

export type DatePeriod = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK';

export interface WorkshopDashboardProps {
  tickets?: InternalTicket[];
  staffList?: InternalStaffMember[];
  loading?: boolean;
  onRefresh?: () => void;
  onOpenDispatch?: (ticket: InternalTicket) => void;
  onOpenStage5Billing?: (ticket: InternalTicket) => void;
  setActiveTab?: (tab: InternalTab) => void;
  currentRole?: UserRole;
  currentUserName?: string;
}

/** Does a date fall inside the selected dashboard period (Today / Yesterday / This Week)? */
function matchesPeriod(dateStr: string | null | undefined, period: DatePeriod): boolean {
  if (!dateStr) return false;
  const ticketDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'TODAY') {
    return ticketDate >= today;
  }
  if (period === 'YESTERDAY') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return ticketDate >= yesterday && ticketDate < today;
  }
  if (period === 'THIS_WEEK') {
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    return ticketDate >= startOfWeek;
  }
  return true;
}

export function WorkshopDashboard({
  tickets = [],
  staffList = [],
  loading: _loading,
  onRefresh,
  onOpenDispatch,
  onOpenStage5Billing,
  setActiveTab,
  currentRole: _currentRole,
  currentUserName = 'Admin',
}: WorkshopDashboardProps) {
  const navigate = useNavigate();
  const now = useNow();
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('TODAY');
  const [volumeView, setVolumeView] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  // Dynamic Workshop Scheduling Capacity sync (Base 6 to Max 10)
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayCapacityLimit = useMemo(() => {
    return getDailyCapacityLimit(todayDateStr);
  }, [todayDateStr]);

  // Dynamic Workshop Bay Maintenance Sync
  const [maintenanceBays, setMaintenanceBays] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(BAY_MAINTENANCE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleMaintenanceChange = () => {
      try {
        const saved = localStorage.getItem(BAY_MAINTENANCE_KEY);
        setMaintenanceBays(saved ? JSON.parse(saved) : {});
      } catch {
        setMaintenanceBays({});
      }
    };
    window.addEventListener('storage', handleMaintenanceChange);
    window.addEventListener('motocare_bay_maintenance_updated', handleMaintenanceChange);
    return () => {
      window.removeEventListener('storage', handleMaintenanceChange);
      window.removeEventListener('motocare_bay_maintenance_updated', handleMaintenanceChange);
    };
  }, []);

  // Helper: check if date is today
  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };


  // Safe navigation helper (supports internal tab switching or router navigation)
  const handleNavigate = (pathOrTab: InternalTab | string) => {
    if (setActiveTab && ['dashboard', 'queue', 'bays', 'billing', 'staff', 'services', 'messages', 'fleet'].includes(pathOrTab)) {
      setActiveTab(pathOrTab as InternalTab);
    } else {
      navigate(pathOrTab.startsWith('/') ? pathOrTab : `/${pathOrTab}`);
    }
  };

  // 1. Live Active Floor Tickets
  // Motorcycles physically in the shop (bookings that haven't arrived yet are left out)
  const activeFloorTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN' &&
        t.status !== 'MISSED' &&
        t.status !== 'NO_SHOW' &&
        !isAwaitingArrival(t)
    );
  }, [tickets]);

  // 2. Header Status Counters: In Queue & Scheduled Today
  const inQueueCount = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.stage === 1 &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN' &&
        t.status !== 'PENDING_CONFIRMATION' &&
        !t.notes?.includes('[BOOKING:PENDING_CONFIRMATION]')
    ).length;
  }, [tickets]);

  const scheduledTodayCount = useMemo(() => {
    return tickets.filter(
      (t) =>
        !t.is_walk_in &&
        isToday(t.dropoff_date || t.created_at) &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN'
    ).length;
  }, [tickets]);

  // 3. Bay Capacity Status (4 Official Workshop Hydraulic Lifts)
  const bayStatusList: BayStatus[] = useMemo(() => {
    return OFFICIAL_BAYS.map((bay) => {
      const isMaint = !!maintenanceBays[bay.id];
      if (isMaint) {
        return {
          id: bay.id,
          bayNumber: bay.bayNumber,
          name: bay.name,
          status: 'MAINTENANCE' as const,
          bikeModel: null,
          plateNumber: 'Under Maintenance',
          stage: undefined,
          mechanic: null,
        };
      }

      const ticket = activeFloorTickets.find((t) => {
        if (!t.assigned_bay) return false;
        return normalizeBayNumber(t.assigned_bay) === bay.bayNumber;
      });

      if (ticket) {
        return {
          id: bay.id,
          bayNumber: bay.bayNumber,
          name: bay.name,
          status: 'OCCUPIED' as const,
          bikeModel: ticket.motorcycles?.model || 'Motorcycle Unit',
          plateNumber: ticket.motorcycles?.plate_number || 'NO PLATE',
          stage: ticket.stage,
          mechanic: ticket.assigned_mechanic || 'Assigned Tech',
        };
      }

      return {
        id: bay.id,
        bayNumber: bay.bayNumber,
        name: bay.name,
        status: 'AVAILABLE' as const,
        bikeModel: null,
        plateNumber: null,
        stage: undefined,
        mechanic: null,
      };
    });
  }, [activeFloorTickets, maintenanceBays]);

  const occupiedBaysCount = bayStatusList.filter((b) => b.status === 'OCCUPIED').length;
  const maintenanceBaysCount = bayStatusList.filter((b) => b.status === 'MAINTENANCE').length;
  const activeLiftsCount = Math.max(1, bayStatusList.length - maintenanceBaysCount);
  const bayUtilizationPct = Math.min(100, Math.round((occupiedBaysCount / activeLiftsCount) * 100));

  // 4. Top KPI Metrics
  const kpis: DashboardKPIs = useMemo(() => {
    const bikesInBays = tickets.filter(
      (t) => t.stage >= 2 && t.stage <= 4 && t.status === 'IN_PROGRESS'
    ).length;

    const completedInPeriod = tickets.filter(
      (t) => t.status === 'COMPLETED' && matchesPeriod(t.paid_at || t.updated_at || t.created_at, selectedPeriod)
    ).length;

    // Units completed and awaiting customer pickup at counter
    const readyForReleaseCount = tickets.filter(
      (t) =>
        (t.stage === 5 || t.status === 'READY_FOR_PICKUP') &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN'
    ).length;

    const periodLabel =
      selectedPeriod === 'TODAY'
        ? 'Completed Today'
        : selectedPeriod === 'YESTERDAY'
        ? 'Completed Yesterday'
        : 'Completed This Week';

    const periodSubtext =
      selectedPeriod === 'TODAY'
        ? 'Finished & released units today'
        : selectedPeriod === 'YESTERDAY'
        ? 'Units released yesterday'
        : 'Total released units this week';

    const bayUtilizationText = maintenanceBaysCount > 0
      ? `${occupiedBaysCount}/${activeLiftsCount} Active (${maintenanceBaysCount} Maint)`
      : `${occupiedBaysCount}/${activeLiftsCount} Lifts Active (${bayUtilizationPct}%)`;

    return {
      activeBikesOnFloor: bikesInBays,
      completedToday: completedInPeriod,
      readyForRelease: readyForReleaseCount,
      bayUtilizationText,
      bayUtilizationPct,
      periodLabel,
      periodSubtext,
    };
  }, [tickets, selectedPeriod, occupiedBaysCount, activeLiftsCount, maintenanceBaysCount, bayUtilizationPct]);

  // Pending Online Booking Requests
  const pendingRequestsCount = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.status === 'PENDING_CONFIRMATION' ||
        Boolean(t.notes && t.notes.includes('[BOOKING:PENDING_CONFIRMATION]'))
    ).length;
  }, [tickets]);

  // Customer rating: same published numbers the public sees on the landing page
  const [reviewStats, setReviewStats] = useState<{ count: number; avg: string }>({ count: 0, avg: '0.0' });
  useEffect(() => {
    db()
      .from('customer_review_stats')
      .select('review_count, average_rating')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReviewStats({ count: Number(data.review_count) || 0, avg: (Number(data.average_rating) || 0).toFixed(1) });
        }
      });
  }, [tickets]);


  // 6. Elapsed Time Helper
  const getElapsedTimeBadge = (createdStr?: string) => {
    if (!createdStr) return '15m';
    const diffMs = now - new Date(createdStr).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMins < 60) return `${diffMins}m elapsed`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''} elapsed`;
  };

  // 7. Dynamic Service Volume Chart Data (Weekly or Monthly)
  const volumeData = useMemo(() => {
    if (volumeView === 'MONTHLY') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthLabel = now.toLocaleDateString('en-US', { month: 'short' });

      const weeks = [
        { label: 'Wk 1 (1-7)', count: 0 },
        { label: 'Wk 2 (8-14)', count: 0 },
        { label: 'Wk 3 (15-21)', count: 0 },
        { label: 'Wk 4 (22+)', count: 0 },
      ];

      tickets.forEach((t) => {
        if (t.status === 'COMPLETED') {
          const d = new Date(t.paid_at || t.updated_at || t.created_at);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            const dateNum = d.getDate();
            if (dateNum <= 7) weeks[0].count += 1;
            else if (dateNum <= 14) weeks[1].count += 1;
            else if (dateNum <= 21) weeks[2].count += 1;
            else weeks[3].count += 1;
          }
        }
      });

      const totalMonthly = weeks.reduce((sum, w) => sum + w.count, 0);
      const maxVal = Math.max(...weeks.map((w) => w.count));
      const peakIdx = maxVal > 0 ? weeks.findIndex((w) => w.count === maxVal) : -1;

      return {
        view: 'MONTHLY' as const,
        title: `Monthly Service Volume (${monthLabel} ${currentYear})`,
        subtitle: `Completed motorcycle repairs by week in ${monthLabel}`,
        totalSummary: `Total completed this month: ${totalMonthly} units`,
        peakLabel: peakIdx !== -1 ? `${weeks[peakIdx].label} Peak (${maxVal} units)` : null,
        emptyBadge: '0 This Month',
        bars: weeks.map((w, idx) => ({
          label: w.label,
          count: w.count,
          heightPct: maxVal > 0 ? Math.round((w.count / maxVal) * 100) : 0,
          isPeak: maxVal > 0 && idx === peakIdx,
        })),
      };
    }

    // Default: WEEKLY
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const liveCounts = [0, 0, 0, 0, 0, 0, 0];

    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    tickets.forEach((t) => {
      if (t.status === 'COMPLETED') {
        const ticketDate = new Date(t.paid_at || t.updated_at || t.created_at);
        if (ticketDate >= monday && ticketDate <= sunday) {
          const d = ticketDate.getDay();
          const adjustedIdx = d === 0 ? 6 : d - 1;
          liveCounts[adjustedIdx] += 1;
        }
      }
    });

    const totalThisWeek = liveCounts.reduce((sum, c) => sum + c, 0);
    const maxVal = Math.max(...liveCounts);
    const peakIdx = maxVal > 0 ? liveCounts.indexOf(maxVal) : -1;

    return {
      view: 'WEEKLY' as const,
      title: 'Weekly Service Volume',
      subtitle: 'Completed motorcycle repairs by work day',
      totalSummary: `Total completed this week: ${totalThisWeek} units`,
      peakLabel: peakIdx !== -1 ? `${days[peakIdx]} Peak (${maxVal} units)` : null,
      emptyBadge: '0 This Week',
      bars: days.map((dayName, idx) => ({
        label: dayName,
        count: liveCounts[idx],
        heightPct: maxVal > 0 ? Math.round((liveCounts[idx] / maxVal) * 100) : 0,
        isPeak: maxVal > 0 && idx === peakIdx,
      })),
    };
  }, [tickets, volumeView]);

  // 8. Technicians on Floor (Real Database Staff with Live Status)
  const techniciansOnFloor: TechnicianStatus[] = useMemo(() => {
    const floorStaff = staffList.filter((s) => s.role === 'staff' || !s.role);

    return floorStaff.map((staff) => {
      const activeTicket = activeFloorTickets.find(
        (t) => t.assigned_mechanic?.trim().toLowerCase() === staff.fullName?.trim().toLowerCase()
      );

      const completedToday = tickets.filter(
        (t) =>
          t.assigned_mechanic?.trim().toLowerCase() === staff.fullName?.trim().toLowerCase() &&
          t.status === 'COMPLETED' &&
          isToday(t.paid_at || t.updated_at || t.created_at)
      ).length;

      return {
        id: staff.id,
        name: staff.fullName || 'Staff Member',
        position: staff.position || 'Technician',
        isAvailable: !activeTicket,
        assignedBay: activeTicket ? (activeTicket.assigned_bay || 'Bay Lift') : undefined,
        completedJobsToday: completedToday,
      };
    });
  }, [staffList, activeFloorTickets, tickets]);

  // Quick Advance Action
  // Stage 1 → pick a bay first; 2-3 → next stage; 4 → ready for pickup; 5 → release at the counter
  const handleQuickAdvance = async (ticket: InternalTicket) => {
    if (ticket.stage >= 5) {
      if (onOpenStage5Billing) {
        onOpenStage5Billing(ticket);
      } else {
        handleNavigate('billing');
      }
      return;
    }

    if (ticket.stage === 1 || !ticket.assigned_bay) {
      onOpenDispatch?.(ticket);
      return;
    }

    {
      try {
        setUpdatingTicketId(ticket.id);
        const nextStage = ticket.stage + 1;
        const updates = { stage: nextStage, status: nextStage === 5 ? 'READY_FOR_PICKUP' : 'IN_PROGRESS' };
        const { data: savedRows, error } = await db()
          .from('service_tickets')
          .update(updates)
          .eq('id', ticket.id)
          .select('id');

        if (error) throw error;
        if (!savedRows || savedRows.length === 0) throw new Error('The stage change was not saved.');

        // Realtime cross-device broadcast
        broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });

        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'STAGE_CHANGE',
          actor: currentUserName,
          details: `Stage advanced from Stage ${ticket.stage} to Stage ${nextStage} from Workshop Dashboard`,
          previousValue: `Stage ${ticket.stage}`,
          newValue: `Stage ${nextStage}`,
        });

        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to advance stage:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to advance stage.');
      } finally {
        setUpdatingTicketId(null);
      }
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* 1. HEADER & CONTROLS */}
      {/* ==================================================================== */}
      <div className="space-y-4 px-1">
        {/* Filter Controls & Live Status Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200/80 rounded-full shadow-2xs text-xs overflow-x-auto max-w-full">
            <span className="pl-2.5 pr-1 text-slate-400 flex items-center gap-1 text-[11px] font-semibold shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Period:</span>
            </span>
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK'] as DatePeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedPeriod === p
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {p === 'TODAY' ? `Today (${currentDateFormatted})` : p === 'YESTERDAY' ? 'Yesterday' : 'This Week'}
              </button>
            ))}
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Counter: In Queue */}
            <div 
              onClick={() => handleNavigate('queue')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Motorcycles waiting in intake queue"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-amber-700">In Queue:</span>
              <span>{inQueueCount} Waiting</span>
            </div>

            {/* Quick Counter: Scheduled Today */}
            <div 
              onClick={() => handleNavigate('queue')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200/80 text-blue-900 text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Online scheduled customer bookings for today"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-700">Scheduled:</span>
              <span>{todayCapacityLimit === 0 ? 'Closed today' : `${scheduledTodayCount} / ${todayCapacityLimit} Slots`}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsWalkInModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-sm shadow-orange-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Walk-in</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Online Requests Alert Banner */}
      {pendingRequestsCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-amber-950">
                  {pendingRequestsCount} Pending Online Booking Request{pendingRequestsCount > 1 ? 's' : ''}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 text-[10px] font-black uppercase">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-800/80 mt-0.5">
                New online appointment requests waiting for workshop review and confirmation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab?.('actions')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition cursor-pointer self-start sm:self-auto shadow-xs active:scale-95 shrink-0"
          >
            Review in Action Center ➔
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. TOP KPI METRICS (4-COLUMN RESPONSIVE BALANCED GRID) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
        
        {/* KPI 1: Active Bikes on Floor */}
        <div className="bg-white rounded-2xl p-4.5 sm:p-5 shadow-xs border border-slate-100/90 hover:border-orange-200/80 transition flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">Active Bikes on Floor</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {kpis.activeBikesOnFloor}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              Currently in service bays
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 shadow-2xs shrink-0 ml-2">
            <Bike className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          </div>
        </div>

        {/* KPI 2: Completed in Selected Period */}
        <div className="bg-white rounded-2xl p-4.5 sm:p-5 shadow-xs border border-slate-100/90 hover:border-emerald-200/80 transition flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">
              {kpis.periodLabel || 'Completed Today'}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {kpis.completedToday}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              {kpis.periodSubtext || 'Completed & released today'}
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0 ml-2">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          </div>
        </div>

        {/* KPI 3: Ready for Release (Operational Metric) */}
        <div 
          onClick={() => handleNavigate('billing')}
          className="bg-white rounded-2xl p-4.5 sm:p-5 shadow-xs border border-slate-100/90 hover:border-blue-200/80 transition flex items-center justify-between cursor-pointer group"
          title="Click to view Counter Release queue"
        >
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">Ready for Release</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {kpis.readyForRelease}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              Waiting for pickup
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shadow-2xs shrink-0 group-hover:scale-105 transition-transform ml-2">
            <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          </div>
        </div>

        {/* KPI 4: Customer Satisfaction & Rating */}
        <div
          onClick={() => setActiveTab?.('reviews')}
          className="bg-white rounded-2xl p-4.5 sm:p-5 shadow-xs border border-slate-100/90 hover:border-amber-300 transition flex items-center justify-between cursor-pointer group"
          title="Click to view all verified customer reviews & feedback"
        >
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate group-hover:text-amber-700 transition">Customer Satisfaction</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight flex items-center gap-1.5">
              <span>{reviewStats.avg}</span>
              <span className="text-sm font-bold text-slate-400">/ 5.0</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold block truncate">
              {reviewStats.count > 0 ? `${reviewStats.count} public reviews (Manage →)` : 'No reviews yet'}
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-500 shadow-2xs shrink-0 group-hover:scale-105 transition-transform ml-2">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 stroke-[1.5]" />
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. MIDDLE SECTION: WEEKLY VOLUME & 2x2 STREAMLINED BAY CAPACITY */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 📊 SERVICE VOLUME (Weekly & Monthly Reactive View) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-100 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {volumeData.title}
              </h2>
              <p className="text-xs text-slate-400">{volumeData.subtitle}</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {volumeData.peakLabel ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                  {volumeData.peakLabel}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200/80 text-[10px] font-semibold">
                  {volumeData.emptyBadge}
                </span>
              )}

              <div className="flex items-center p-0.5 bg-slate-100 rounded-full text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setVolumeView('WEEKLY')}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    volumeView === 'WEEKLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeView('MONTHLY')}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    volumeView === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 px-1 sm:px-2 pb-1">
              {volumeData.bars.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group cursor-default">
                  {/* Tooltip on Hover */}
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {d.count}
                  </span>

                  {/* Rounded Bar Pill */}
                  <div
                    style={{ height: d.count > 0 ? `${Math.max(d.heightPct, 18)}%` : '6px' }}
                    className={`w-full max-w-[28px] rounded-xl transition-all duration-300 relative ${
                      d.count > 0
                        ? d.isPeak
                          ? 'bg-gradient-to-t from-orange-500 to-amber-500 shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {d.isPeak && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-1" />
                    )}
                  </div>

                  {/* Day / Week Label */}
                  <span className={`text-[9px] sm:text-[10px] font-bold mt-2 uppercase text-center truncate max-w-full ${
                    d.isPeak ? 'text-orange-600 font-extrabold' : 'text-slate-400'
                  }`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span>
              <strong className="text-slate-900">{volumeData.totalSummary}</strong>
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Live database records
            </span>
          </div>
        </div>

        {/* 🛠️ STREAMLINED BAY CAPACITY WIDGET (2x2 COMPACT GRID) (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-100 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Bay Status
              </h2>
              <p className="text-xs text-slate-400">
                {occupiedBaysCount} of {activeLiftsCount} bays currently occupied {maintenanceBaysCount > 0 ? `(${maintenanceBaysCount} Maint)` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-bold">
              <span>{bayUtilizationPct}% Capacity</span>
            </div>
          </div>

          {/* Compact 10-bay grid: green = free, orange = in use, grey = maintenance */}
          <div className="grid grid-cols-5 gap-2">
            {bayStatusList.map((bay) => {
              const isOccupied = bay.status === 'OCCUPIED';
              const isMaintenance = bay.status === 'MAINTENANCE';
              return (
                <button
                  key={bay.id}
                  type="button"
                  onClick={() => handleNavigate('bays')}
                  title={
                    isMaintenance
                      ? `${bay.name}: under maintenance`
                      : isOccupied
                      ? `${bay.name}: ${bay.bikeModel || 'In use'}${bay.plateNumber ? ` (${bay.plateNumber})` : ''}`
                      : `${bay.name}: available`
                  }
                  className={`rounded-xl border py-2.5 px-1 text-center transition cursor-pointer hover:shadow-2xs ${
                    isMaintenance
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : isOccupied
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-700'
                  }`}
                >
                  <span className="block text-sm font-black leading-none">{bay.name.replace(/\D/g, '').padStart(2, '0')}</span>
                  <span className="block text-[9px] font-semibold mt-1 truncate">
                    {isMaintenance ? 'Maint.' : isOccupied ? (bay.stage ? `Stage ${bay.stage}` : 'In use') : 'Free'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Free</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> In use</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Maintenance</span>
          </div>

          {/* Clean Manage Bay Lifts Button */}
          <button
            type="button"
            onClick={() => handleNavigate('bays')}
            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200/80 hover:border-slate-300 active:scale-95"
          >
            <Wrench className="w-3.5 h-3.5 text-orange-600" />
            <span>View Workshop Bays →</span>
          </button>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 4. BOTTOM SECTION: ACTIVE FLOOR ACTIVITY (LEFT) & TECHNICIANS (RIGHT) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 🏍️ ACTIVE FLOOR ACTIVITY (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  Active Floor Activity
                </h2>
                <p className="text-xs text-slate-400">Ongoing motorcycle repairs currently in bays</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('queue')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <span>View Full Queue</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Table / Card List of Top 4 Active Ongoing Tickets */}
          {activeFloorTickets.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Bike className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">No active repairs on floor</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                All workshop bays are clear and ready for walk-in or scheduled motorcycle intake.
              </p>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(true)}
                className="mt-2 px-4 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                + Create Walk-in Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeFloorTickets.slice(0, 4).map((t) => {
                const elapsedStr = getElapsedTimeBadge(t.created_at);
                
                // Status pill label and styling
                let statusBadgeText = 'In Progress';
                let statusBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200/80';

                if (t.stage === 1) {
                  statusBadgeText = 'In Intake';
                  statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                } else if (t.stage === 2) {
                  statusBadgeText = 'Inspection';
                  statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                } else if (t.stage === 3) {
                  statusBadgeText = 'In Progress';
                  statusBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200/80';
                } else if (t.stage === 4) {
                  statusBadgeText = 'Testing';
                  statusBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                } else if (t.stage === 5) {
                  statusBadgeText = 'Ready for Release';
                  statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                }

                return (
                  <div
                    key={t.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Ticket #, Model & Plate */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 font-mono shadow-2xs">
                        #{t.ticket_code ? t.ticket_code.slice(-4) : 'MC'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {t.motorcycles?.model || 'Motorcycle Unit'}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700">
                            {t.motorcycles?.plate_number || 'NO PLATE'}
                          </span>
                          {/* Status Pill on mobile */}
                          <span className={`sm:hidden px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusBadgeClass}`}>
                            {statusBadgeText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                          <span className="truncate">{t.service_type}</span>
                          <span>•</span>
                          <span className="font-bold text-slate-700">{t.assigned_bay || 'Bay Lift'}</span>
                          <span className="sm:hidden text-[10px] text-slate-400">• {elapsedStr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mechanic, Elapsed Time, Status pill & Quick Advance */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-semibold text-slate-800 block truncate max-w-[140px]">
                          {t.assigned_mechanic || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{elapsedStr}</span>
                        </span>
                      </div>

                      {/* Status Pill on desktop/tablet */}
                      <span className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadgeClass}`}>
                        {statusBadgeText}
                      </span>

                      {/* Action Button */}
                      <button
                        type="button"
                        disabled={updatingTicketId === t.id}
                        onClick={() => handleQuickAdvance(t)}
                        className="px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        <span>
                          {t.stage >= 5
                            ? 'Release ➔'
                            : t.stage === 1 || !t.assigned_bay
                            ? 'Assign Bay ➔'
                            : t.stage === 4
                            ? 'Mark Ready ➔'
                            : 'Advance ➔'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 👥 WORKSHOP STAFF (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Workshop Staff
                </h2>
                <p className="text-xs text-slate-400">Active staff members on duty</p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
                {techniciansOnFloor.length} Staff
              </span>
            </div>

            {/* Staff Roster */}
            {techniciansOnFloor.length === 0 ? (
              <div className="py-8 px-3 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2 mt-3">
                <Users className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No staff members on duty</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Add staff members in Staff Management to track floor assignments and job completions.
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigate('staff')}
                  className="mt-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-orange-600 font-bold hover:bg-orange-50 text-xs transition cursor-pointer"
                >
                  + Add Staff
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {techniciansOnFloor.map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">{tech.name}</span>
                          {/* Live badge: Available vs Assigned to Bay X */}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              tech.isAvailable ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'
                            }`}
                            title={tech.isAvailable ? 'Available' : 'Assigned to Bay'}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {tech.isAvailable ? (
                            <span className="text-emerald-600 font-semibold">Available</span>
                          ) : (
                            <span className="text-orange-600 font-semibold">Assigned to {tech.assignedBay || 'Bay'}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
                      {tech.completedJobsToday} completed today
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Workshop Staff Team</span>
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('staff')}
              className="font-bold text-orange-600 hover:underline cursor-pointer"
            >
              Manage Roster →
            </button>
          </div>
        </div>

      </div>

      {/* New Walk-in Ticket Modal */}
      <NewWalkInTicketModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onTicketCreated={() => {
          if (onRefresh) onRefresh();
          handleNavigate('queue');
        }}
        currentStaffName={currentUserName}
      />

    </div>
  );
}

export default WorkshopDashboard;
