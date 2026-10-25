import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { isAwaitingArrival } from '../utils/ticketActions';
import { toast } from '../utils/toast';
import { useNow } from '../hooks/useNow';
import { InternalTicket, UserRole, InternalTab } from '../types/internal';
import type { OperationalView } from './InternalQueueTab';
import { 
  Plus, 
  ArrowUpRight, 
  Wrench,
  CheckCircle2,
  Bike,
  Clock, 
  KeyRound,
  Users,
  Star
} from '../../components/icons';
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
  { id: 'bay-1', searchKey: 'bay 01', bayNumber: 1, name: 'Bay 01' },
  { id: 'bay-2', searchKey: 'bay 02', bayNumber: 2, name: 'Bay 02' },
  { id: 'bay-3', searchKey: 'bay 03', bayNumber: 3, name: 'Bay 03' },
  { id: 'bay-4', searchKey: 'bay 04', bayNumber: 4, name: 'Bay 04' },
  { id: 'bay-5', searchKey: 'bay 05', bayNumber: 5, name: 'Bay 05' },
  { id: 'bay-6', searchKey: 'bay 06', bayNumber: 6, name: 'Bay 06' },
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

export interface MechanicOnFloor {
  name: string;
  bays: string[]; // bays of the motorcycles they are working on now
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
  loading?: boolean;
  onRefresh?: () => void;
  onOpenDispatch?: (ticket: InternalTicket) => void;
  onOpenStage5Billing?: (ticket: InternalTicket) => void;
  setActiveTab?: (tab: InternalTab) => void;
  /** Opens the Queue on a specific view (e.g. pending online bookings) */
  onOpenQueueView?: (view: OperationalView) => void;
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
  loading: _loading,
  onRefresh,
  onOpenDispatch,
  onOpenStage5Billing,
  setActiveTab,
  onOpenQueueView,
  currentRole,
  currentUserName = 'Admin',
}: WorkshopDashboardProps) {
  const navigate = useNavigate();
  const now = useNow();
  // Team management links are for the shop owner only
  const isOwner = currentRole === 'admin';
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('TODAY');
  const [volumeView, setVolumeView] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  // Daily booking capacity (6 slots, closed Sundays)
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
    if (setActiveTab && ['dashboard', 'queue', 'bays', 'staff', 'services', 'messages', 'fleet'].includes(pathOrTab)) {
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
        ? 'Completed today'
        : selectedPeriod === 'YESTERDAY'
        ? 'Completed yesterday'
        : 'Completed this week';

    const periodSubtext =
      selectedPeriod === 'TODAY'
        ? 'Released to the owner today'
        : selectedPeriod === 'YESTERDAY'
        ? 'Released to the owner yesterday'
        : 'Released to the owner this week';

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
        title: 'Completed repairs',
        subtitle: `Per week, ${monthLabel} ${currentYear}`,
        totalSummary: `${totalMonthly} completed this month`,
        peakLabel: peakIdx !== -1 ? `${weeks[peakIdx].label} (${maxVal})` : null,
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
      title: 'Completed repairs',
      subtitle: 'Per day, this week',
      totalSummary: `${totalThisWeek} completed this week`,
      peakLabel: peakIdx !== -1 ? `${days[peakIdx]} (${maxVal})` : null,
      emptyBadge: '0 This Week',
      bars: days.map((dayName, idx) => ({
        label: dayName,
        count: liveCounts[idx],
        heightPct: maxVal > 0 ? Math.round((liveCounts[idx] / maxVal) * 100) : 0,
        isPeak: maxVal > 0 && idx === peakIdx,
      })),
    };
  }, [tickets, volumeView]);

  // 8. Mechanics on the floor: the names typed on tickets (mechanics don't need an account)
  const mechanicsOnFloor: MechanicOnFloor[] = useMemo(() => {
    const byName = new Map<string, MechanicOnFloor>();
    const entryFor = (rawName: string | null | undefined) => {
      const name = rawName?.trim();
      if (!name || name === 'Queued for Assignment') return null;
      const key = name.toLowerCase();
      if (!byName.has(key)) byName.set(key, { name, bays: [], completedJobsToday: 0 });
      return byName.get(key)!;
    };

    activeFloorTickets.forEach((t) => {
      const entry = entryFor(t.assigned_mechanic);
      if (entry) entry.bays.push(t.assigned_bay || 'No bay yet');
    });
    tickets
      .filter((t) => t.status === 'COMPLETED' && isToday(t.paid_at || t.updated_at || t.created_at))
      .forEach((t) => {
        const entry = entryFor(t.assigned_mechanic);
        if (entry) entry.completedJobsToday += 1;
      });

    // Busy mechanics first, then by name
    return [...byName.values()].sort(
      (a, b) => b.bays.length - a.bays.length || a.name.localeCompare(b.name)
    );
  }, [activeFloorTickets, tickets]);

  // Quick Advance Action
  // Stage 1 → pick a bay first; 2-3 → next stage; 4 → ready for pickup; 5 → release at the counter
  const handleQuickAdvance = async (ticket: InternalTicket) => {
    if (ticket.stage >= 5) {
      if (onOpenStage5Billing) {
        onOpenStage5Billing(ticket);
      } else {
        handleNavigate('queue');
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

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUserName.trim().split(/\s+/)[0] || 'there';

  // Shared look (same as the customer dashboard): white cards with large rounded corners
  const card = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';
  const orangeButtonShadow = 'shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30';

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Greeting + quick status (same layout as the rider "Welcome back" header) */}
      {/* Compact: the header bar above already names the page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1.5 sm:px-1">
        <div className="min-w-0">
          <h2 className="font-display text-2xl sm:text-[1.75rem] font-extrabold text-slate-900 tracking-[-0.03em] leading-tight truncate">
            {greeting}, <span className="text-orange-500">{firstName}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleNavigate('queue')}
              className="hover:text-slate-900 transition cursor-pointer"
              title="Motorcycles waiting at intake"
            >
              <strong className="font-semibold text-slate-800">{inQueueCount}</strong> waiting at intake
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleNavigate('queue')}
              className="hover:text-slate-900 transition cursor-pointer"
              title="Online bookings for today"
            >
              {todayCapacityLimit === 0 ? (
                'Closed today'
              ) : (
                <>
                  <strong className="font-semibold text-slate-800">
                    {scheduledTodayCount} of {todayCapacityLimit}
                  </strong>{' '}
                  booking slots taken today
                </>
              )}
            </button>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWalkInModalOpen(true)}
          className={`self-start sm:self-auto bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 text-sm font-semibold ${orangeButtonShadow} flex items-center gap-1.5 transition duration-150 hover:scale-105 active:scale-95 cursor-pointer shrink-0`}
        >
          <Plus className="w-4 h-4" />
          <span>New walk-in</span>
        </button>
      </div>

      {/* Pending online bookings */}
      {pendingRequestsCount > 0 && (
        <div className={`${card} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-in fade-in duration-200`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Same orange icon tile as the sidebar */}
            <div className="w-11 h-11 rounded-[12px] bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base text-slate-900">
                {pendingRequestsCount} new booking request{pendingRequestsCount > 1 ? 's' : ''}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {pendingRequestsCount > 1
                  ? 'Riders are waiting for you to accept or decline their online bookings.'
                  : 'A rider is waiting for you to accept or decline their online booking.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (onOpenQueueView ? onOpenQueueView('PENDING') : setActiveTab?.('queue'))}
            className={`px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full text-sm transition cursor-pointer self-start sm:self-auto ${orangeButtonShadow} active:scale-95 shrink-0 flex items-center gap-1.5`}
          >
            Review requests
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Key numbers, with the period that "Completed" counts */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">At a glance</h3>
          <div className="flex items-center p-1 bg-white border border-slate-200/80 rounded-full shadow-2xs">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK'] as DatePeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPeriod(p)}
                aria-pressed={selectedPeriod === p}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedPeriod === p ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p === 'TODAY' ? 'Today' : p === 'YESTERDAY' ? 'Yesterday' : 'This week'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              label: 'In the bays',
              value: kpis.activeBikesOnFloor,
              hint: 'Being inspected, repaired, or tested',
              icon: Bike,
              onClick: () => handleNavigate('bays'),
            },
            {
              label: kpis.periodLabel || 'Completed today',
              value: kpis.completedToday,
              hint: kpis.periodSubtext || 'Released to the owner',
              icon: CheckCircle2,
            },
            {
              label: 'Ready for pickup',
              value: kpis.readyForRelease,
              hint: 'Waiting for the owner',
              icon: KeyRound,
              onClick: () => (onOpenQueueView ? onOpenQueueView('READY_RELEASE') : handleNavigate('queue')),
            },
            {
              label: 'Customer rating',
              value: (
                <>
                  {reviewStats.avg}
                  <span className="text-base font-semibold text-slate-400"> / 5</span>
                </>
              ),
              hint: reviewStats.count > 0 ? `${reviewStats.count} public review${reviewStats.count === 1 ? '' : 's'}` : 'No reviews yet',
              icon: Star,
              onClick: () => setActiveTab?.('reviews'),
            },
          ].map((stat) => {
            const Icon = stat.icon;
            const body = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium text-slate-500">{stat.label}</span>
                  <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1">
                  {stat.value}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1 truncate">{stat.hint}</p>
              </>
            );
            return stat.onClick ? (
              <button
                key={stat.label}
                type="button"
                onClick={stat.onClick}
                className={`${card} card-lift p-4 sm:p-5 text-left hover:border-orange-200 cursor-pointer`}
              >
                {body}
              </button>
            ) : (
              <div key={stat.label} className={`${card} p-4 sm:p-5`}>
                {body}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. MIDDLE SECTION: WEEKLY VOLUME & 2x2 STREAMLINED BAY CAPACITY */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Completed repairs per day (week) or per week (month) */}
        <div className={`lg:col-span-7 ${card} p-5 sm:p-6 flex flex-col gap-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">{volumeData.title}</h3>
              <p className="text-xs sm:text-sm text-slate-500">{volumeData.subtitle}</p>
            </div>
            <div className="flex items-center p-1 bg-slate-100 rounded-full">
              {(['WEEKLY', 'MONTHLY'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setVolumeView(view)}
                  aria-pressed={volumeView === view}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    volumeView === view ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {view === 'WEEKLY' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-40 px-1">
              {volumeData.bars.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full">
                  {d.count > 0 && <span className="text-xs font-semibold text-slate-700 mb-1 tabular-nums">{d.count}</span>}
                  <div
                    style={{ height: d.count > 0 ? `${Math.max(d.heightPct, 12)}%` : '4px' }}
                    className={`w-full max-w-[36px] rounded-lg transition-all duration-300 ${
                      d.count > 0 ? (d.isPeak ? 'bg-orange-500' : 'bg-orange-300') : 'bg-slate-100'
                    }`}
                  />
                  <span
                    className={`text-[10px] sm:text-xs mt-2 text-center truncate max-w-full ${
                      d.isPeak ? 'text-slate-900 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
            {volumeData.bars.every((d) => d.count === 0) && (
              <div className="absolute inset-x-0 top-10 text-center text-sm text-slate-400">
                No completed repairs yet {volumeView === 'WEEKLY' ? 'this week' : 'this month'}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-500">
            <span className="font-medium text-slate-700">{volumeData.totalSummary}</span>
            {volumeData.peakLabel && <span className="text-slate-400 truncate">Busiest: {volumeData.peakLabel}</span>}
          </div>
        </div>

        {/* Bays at a glance */}
        <div className={`lg:col-span-5 ${card} p-5 sm:p-6 flex flex-col gap-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Bays</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {occupiedBaysCount} of {activeLiftsCount} in use
                {maintenanceBaysCount > 0 ? ` · ${maintenanceBaysCount} under maintenance` : ''}
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-slate-900 tabular-nums">{bayUtilizationPct}%</span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${bayUtilizationPct}%` }} />
          </div>

          <div className="grid grid-cols-3 gap-2">
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
                  className={`card-lift rounded-2xl border p-3 text-left cursor-pointer hover:border-orange-200 ${
                    isOccupied
                      ? 'bg-orange-50/70 border-orange-200/80 shadow-[0_6px_16px_-8px_rgba(249,115,22,0.35)]'
                      : 'bg-white border-slate-200/80'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-display text-base font-bold text-slate-900">
                      {bay.name.replace(/\D/g, '').padStart(2, '0')}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isMaintenance ? 'bg-slate-300' : isOccupied ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                    />
                  </span>
                  <span
                    className={`block text-[11px] mt-0.5 truncate ${isOccupied ? 'text-orange-700 font-medium' : 'text-slate-400'}`}
                  >
                    {isMaintenance ? 'Maintenance' : isOccupied ? (bay.stage ? `Stage ${bay.stage}` : 'In use') : 'Free'}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('bays')}
            className="mt-auto w-full py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Wrench className="w-4 h-4 text-orange-500" />
            Open Bays
          </button>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 4. BOTTOM SECTION: ACTIVE FLOOR ACTIVITY (LEFT) & TECHNICIANS (RIGHT) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 🏍️ ACTIVE FLOOR ACTIVITY (8 cols; full width for staff, who don't see the staff roster) */}
        <div className={`${isOwner ? 'lg:col-span-8' : 'lg:col-span-12'} ${card} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">On the floor now</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {activeFloorTickets.length === 0
                  ? 'No motorcycles in the shop'
                  : `${activeFloorTickets.length} motorcycle${activeFloorTickets.length === 1 ? '' : 's'} in the shop${
                      activeFloorTickets.length > 4 ? ' · showing the first 4' : ''
                    }`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('queue')}
              className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              Open Queue
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {activeFloorTickets.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
              <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Bike className="w-5 h-5" />
              </span>
              <p className="font-semibold text-slate-800">All bays are clear</p>
              <p className="text-sm text-slate-500 max-w-sm">Start a walk-in, or check in a rider who booked online from the Queue.</p>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(true)}
                className={`mt-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${orangeButtonShadow}`}
              >
                <Plus className="w-4 h-4" />
                New walk-in
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 -mx-1">
              {activeFloorTickets.slice(0, 4).map((t) => {
                const elapsedStr = getElapsedTimeBadge(t.created_at).replace(' elapsed', '');
                const stageName = ['Intake', 'Inspection', 'Repair', 'Testing', 'Ready'][Math.min(Math.max(t.stage, 1), 5) - 1];
                const actionLabel =
                  t.stage >= 5
                    ? 'Release'
                    : t.stage === 1 || !t.assigned_bay
                    ? 'Assign bay'
                    : t.stage === 4
                    ? 'Mark ready'
                    : 'Next stage';

                return (
                  <div key={t.id} className="px-1 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex flex-col items-center justify-center shrink-0 leading-none">
                        <span className="text-[9px] text-slate-400">Stage</span>
                        <span className="font-display text-base font-bold">{t.stage}</span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">
                            {t.motorcycles?.model || 'Motorcycle'}
                          </span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {t.motorcycles?.plate_number || 'No plate'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                          {stageName} · {t.service_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-14 sm:pl-0">
                      <div className="text-xs sm:text-right leading-tight">
                        <span className="block font-medium text-slate-700 truncate max-w-[150px]">
                          {t.assigned_bay || 'No bay yet'} · {t.assigned_mechanic || 'No mechanic'}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 sm:justify-end">
                          <Clock className="w-3 h-3" />
                          {elapsedStr} in the shop
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={updatingTicketId === t.id}
                        onClick={() => handleQuickAdvance(t)}
                        className="px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm transition cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 shadow-sm shadow-orange-500/25"
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 👥 MECHANICS ON THE FLOOR (4 cols) — shop owner only */}
        {isOwner && (
        <div className={`lg:col-span-4 ${card} p-5 sm:p-6 space-y-4 flex flex-col justify-between`}>
          <div>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Mechanics</h3>
                <p className="text-xs sm:text-sm text-slate-500">Names set on today&apos;s tickets</p>
              </div>
              <span className="font-display text-2xl font-bold text-slate-900 tabular-nums">{mechanicsOnFloor.length}</span>
            </div>

            {mechanicsOnFloor.length === 0 ? (
              <div className="py-8 px-3 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2 mt-3">
                <Users className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No mechanic assigned yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Mechanics show up here once their name is set on a ticket in the Queue.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {mechanicsOnFloor.map((mech) => {
                  const isBusy = mech.bays.length > 0;
                  return (
                    <div key={mech.name.toLowerCase()} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {mech.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{mech.name}</span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${isBusy ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}
                              title={isBusy ? 'Working on a motorcycle' : 'Done for now'}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {isBusy ? (
                              <span className="text-orange-600 font-semibold">Working on {mech.bays.join(', ')}</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">No active job</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
                        {mech.completedJobsToday} done today
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Staff accounts are in Team</span>
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('staff')}
              className="font-bold text-orange-600 hover:underline cursor-pointer"
            >
              Open Team →
            </button>
          </div>
        </div>
        )}

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
