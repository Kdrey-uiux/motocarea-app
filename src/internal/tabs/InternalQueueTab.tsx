import { useState, useMemo, useCallback, type ComponentProps } from 'react';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { InternalTicket, UserRole, InternalTab } from '../types/internal';
import { canVoidTicket } from '../utils/permissions';
import { acceptOnlineBooking, cancelOrDeclineTicket, isPendingOnlineBooking } from '../utils/ticketActions';
import {
  adminLateCheckInOverride,
  adminAssistedReschedule,
  isArrivalWindowOver,
  TIME_SLOTS
} from '../../utils/bookingLifecycle';
import { getDailyCapacityLimit, isSundayDate } from '../../utils/workshopCapacity';
import { useNow } from '../hooks/useNow';
import { SERVICE_STAGES, stageName } from '../../utils/serviceStages';
import { 
  Ticket,
  Search, 
  Wrench, 
  ChevronRight, 
  Printer, 
  Copy, 
  Check, 
  Phone, 
  Trash2, 
  Plus, 
  AlertTriangle,
  User,
  KeyRound,
  CheckCircle2,
  History,
  Star,
  MessageSquare,
  Clock,
  LayoutGrid,
  List,
  Calendar,
  UserCheck,
  Edit,
  X,
  MoreHorizontal,
  Kanban,
  CircleX,
  CalendarClock,
  BellRing,
  type LucideIcon,
} from '../../components/icons';
import NewWalkInTicketModal from '../modals/NewWalkInTicketModal';
import WalkInClaimSlipModal from '../modals/WalkInClaimSlipModal';
import VehicleHistoryModal from '../modals/VehicleHistoryModal';
import { parseTicketReview } from '../../utils/ticketReviews';
import { parseTicketNotes, formatPhoneNumber } from '../../utils/ticketNotesParser';
import { InternalStaffMember } from '../types/internal';
import { toast } from '../utils/toast';

function MotorcycleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path d="M7.5 14h5l4-4h4m-4 0l1.5 3" />
      <path d="M10 10l1.5 4" />
      <path d="M12 6h2" />
    </svg>
  );
}

export interface InternalQueueTabProps {
  tickets: InternalTicket[];
  loading?: boolean;
  onRefresh: () => void;
  onOpenDispatch: (ticket: InternalTicket) => void;
  onOpenStage5Billing: (ticket: InternalTicket) => void;
  onOpenReceiptPrint?: (ticket: InternalTicket) => void;
  onOpenJobOrderPrint?: (ticket: InternalTicket) => void;
  currentRole: UserRole;
  currentStaffName?: string;
  onOpenHardcopyModal?: () => void;
  pendingHardcopyCount?: number;
  onNavigateTab?: (tab: InternalTab) => void;
  staffList?: InternalStaffMember[];
  /** View to open first (e.g. 'PENDING' when coming from the Dashboard) */
  initialView?: OperationalView;
}

export type OperationalView = 'ACTIVE' | 'SCHEDULED' | 'PENDING' | 'READY_RELEASE' | 'COMPLETED' | 'MISSED';

/** One status pill style for every ticket: neutral pill, colored dot */
function StatusPill({ label, tone }: { label: string; tone: 'stage' | 'waiting' | 'done' | 'missed' | 'void' }) {
  const dot = {
    stage: 'bg-orange-500',
    waiting: 'bg-amber-400',
    done: 'bg-emerald-500',
    missed: 'bg-rose-500',
    void: 'bg-slate-400',
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// Shared button looks (same as the staff Dashboard)
const PRIMARY_BTN =
  'px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5';
const PRIMARY_BTN_SM =
  'px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1';
const SECONDARY_BTN =
  'px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5';
const ICON_BTN = 'w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer';

interface MoreMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

/** "⋯" button with the less-used ticket tools, so each card footer stays on one line */
function MoreMenu({ items }: { items: MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        aria-label="More actions"
        className={`${ICON_BTN} border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-2 z-20 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition cursor-pointer ${
                  item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.danger ? 'text-rose-500' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
const CHIP = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';
// Left-edge accent per repair stage (1 Intake … 5 Ready)
const STAGE_ACCENT: Record<number, string> = {
  1: 'bg-orange-200',
  2: 'bg-orange-300',
  3: 'bg-orange-400',
  4: 'bg-orange-500',
  5: 'bg-orange-600',
};

export function InternalQueueTab({
  tickets,
  loading: _loading,
  onRefresh,
  onOpenDispatch,
  onOpenStage5Billing,
  onOpenReceiptPrint,
  onOpenJobOrderPrint,
  currentRole,
  currentStaffName = 'Workshop Staff',
  onNavigateTab,
  // Every section is on one page now, so the view to open first is no longer needed
  initialView: _initialView,
}: InternalQueueTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // History list (released / cancelled & missed), opened on demand
  const [historyView, setHistoryView] = useState<'released' | 'closed' | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals state
  const [historyVehicle, setHistoryVehicle] = useState<ComponentProps<typeof VehicleHistoryModal>['vehicle'] | null>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  // Walk-in claim slip (ticket number + creation date the customer needs to track online)
  const [claimSlipTicket, setClaimSlipTicket] = useState<InternalTicket | null>(null);

  // Soft Cancellation Void Modal State
  const [voidTarget, setVoidTarget] = useState<InternalTicket | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Assisted Reschedule State
  const [rescheduleTarget, setRescheduleTarget] = useState<InternalTicket | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(TIME_SLOTS[0]?.id || 'slot-1');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [viewLayout, setViewLayout] = useState<'grid' | 'table' | 'board'>('board');

  // Mechanic Quick Assign Modal State
  const [assigningMechanicTicket, setAssigningMechanicTicket] = useState<InternalTicket | null>(null);
  const [selectedMechanicName, setSelectedMechanicName] = useState<string>('');
  const [isAssigningMechanic, setIsAssigningMechanic] = useState(false);

  const now = useNow();

  // Follows the clock, so a console left open overnight rolls over to the new day
  const todayDateStr = useMemo(() => {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [now]);

  // Mechanics are names only (no accounts); shared list managed in Team


  // Helper to determine if a ticket is a confirmed scheduled advance booking awaiting physical arrival
  const isScheduledBooking = useCallback((t: InternalTicket) => {
    if (t.is_walk_in) return false;
    if (isPendingOnlineBooking(t)) return false;
    if (
      t.status === 'COMPLETED' ||
      t.status === 'CANCELLED' ||
      t.status === 'CANCELLED_BY_ADMIN' ||
      t.status === 'MISSED' ||
      t.status === 'NO_SHOW'
    ) return false;
    if (t.stage > 4) return false;
    // Already at the shop (checked in or late arrival approved)
    if (t.notes && (t.notes.includes('[CHECKED_IN') || t.notes.includes('[LATE_CHECKIN_OVERRIDE'))) return false;

    // Explicit dropoff pending status or confirmed advance booking
    if (t.status === 'PENDING_DROPOFF' || t.status === 'CONFIRMED_APPOINTMENT') return true;

    // Stage 1 booking without an occupied bay lift
    const hasRealBay = t.assigned_bay && t.assigned_bay !== 'Bay Assignment Pending';
    if (t.stage === 1 && !hasRealBay) {
      if (t.dropoff_date && t.dropoff_date > todayDateStr) {
        return true;
      }
      if (t.notes && t.notes.includes('[BOOKING:PENDING_DROPOFF]')) {
        return true;
      }
    }

    return false;
  }, [todayDateStr]);

  // Helper to determine if a ticket is physically on the active shop floor
  const isActiveFloorTicket = useCallback((t: InternalTicket) => {
    if (isPendingOnlineBooking(t)) return false;
    if (isScheduledBooking(t)) return false;
    if (
      t.status === 'COMPLETED' ||
      t.status === 'CANCELLED' ||
      t.status === 'CANCELLED_BY_ADMIN' ||
      t.status === 'MISSED' ||
      t.status === 'NO_SHOW'
    ) return false;
    return true;
  }, [isScheduledBooking]);

  // Riders booked to drop off today (shown when the shop floor is empty)
  const todaysArrivals = useMemo(
    () => tickets.filter((t) => isScheduledBooking(t) && t.dropoff_date === todayDateStr),
    [tickets, isScheduledBooking, todayDateStr]
  );

  // Date formatters
  const formatAppointmentDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { label: dateStr, isToday: false, isPast: false, diffDays: 0 };
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const target = new Date(y, m, d);
    target.setHours(0, 0, 0, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formattedShort = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (diffDays === 0) return { label: `Today, ${formattedShort}`, isToday: true, isPast: false, diffDays };
    if (diffDays === 1) return { label: `Tomorrow, ${formattedShort}`, isToday: false, isPast: false, diffDays };
    if (diffDays > 1 && diffDays <= 7) return { label: `In ${diffDays} days (${formattedShort})`, isToday: false, isPast: false, diffDays };
    if (diffDays < 0) return { label: `${formattedShort} (Past Due)`, isToday: false, isPast: true, diffDays };
    return { label: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), isToday: false, isPast: false, diffDays };
  };

  const formatBookingCreatedDate = (createdAtStr?: string | null) => {
    if (!createdAtStr) return 'N/A';
    const d = new Date(createdAtStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };



  // Search across every section
  const matchesSearch = useCallback(
    (t: InternalTicket) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return [
        t.ticket_code,
        t.customer_name,
        t.customer_phone,
        t.motorcycles?.model,
        t.motorcycles?.plate_number,
        t.assigned_bay,
        t.assigned_mechanic,
        t.service_type,
      ].some((field) => (field || '').toLowerCase().includes(q));
    },
    [searchQuery]
  );

  // The page, most urgent first: needs action, in the shop, upcoming, history
  const sections = useMemo(() => {
    const isClosed = (t: InternalTicket) =>
      ['MISSED', 'NO_SHOW', 'CANCELLED', 'CANCELLED_BY_ADMIN'].includes(t.status);
    const byDate = (a: InternalTicket, b: InternalTicket) =>
      (a.dropoff_date || '9999-99-99').localeCompare(b.dropoff_date || '9999-99-99') ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    const newestFirst = (a: InternalTicket, b: InternalTicket) =>
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();

    const pending = tickets.filter((t) => isPendingOnlineBooking(t) && !isClosed(t) && matchesSearch(t));
    const arrivingToday = todaysArrivals.filter(matchesSearch);
    const inShop = tickets.filter((t) => isActiveFloorTicket(t) && matchesSearch(t));
    const upcoming = tickets
      .filter((t) => isScheduledBooking(t) && t.dropoff_date !== todayDateStr && matchesSearch(t))
      .sort(byDate);
    const released = tickets.filter((t) => t.status === 'COMPLETED' && matchesSearch(t)).sort(newestFirst);
    const closed = tickets.filter((t) => isClosed(t) && matchesSearch(t)).sort(newestFirst);

    return { pending, arrivingToday, needsAction: [...pending, ...arrivingToday], inShop, upcoming, released, closed };
  }, [tickets, todaysArrivals, matchesSearch, isActiveFloorTicket, isScheduledBooking, todayDateStr]);

  const totalShown =
    sections.needsAction.length +
    sections.inShop.length +
    sections.upcoming.length +
    sections.released.length +
    sections.closed.length;

  // Open Quick Assign Mechanic Modal
  const handleOpenAssignMechanic = (ticket: InternalTicket) => {
    setAssigningMechanicTicket(ticket);
    setSelectedMechanicName(
      ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment'
        ? ticket.assigned_mechanic
        : ''
    );
  };

  // Save Mechanic Assignment
  const handleSaveMechanicAssignment = async () => {
    if (!assigningMechanicTicket) return;
    setIsAssigningMechanic(true);
    try {
      const mechName = selectedMechanicName.trim() || null;
      const updates = {
        assigned_mechanic: mechName,
      };

      const { data, error } = await db()
        .from('service_tickets')
        .update(updates)
        .eq('id', assigningMechanicTicket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 03_service_tickets.sql.');
      }

      await recordAuditLog({
        ticketCode: assigningMechanicTicket.ticket_code,
        action: 'MECHANIC_ASSIGNED',
        actor: currentStaffName,
        details: mechName ? `Assigned mechanic: ${mechName}` : 'Cleared mechanic assignment.',
        previousValue: assigningMechanicTicket.assigned_mechanic || 'None',
        newValue: mechName || 'None',
      });

      broadcastTicketSync({ id: assigningMechanicTicket.id, ticket_code: assigningMechanicTicket.ticket_code, ...updates });
      setAssigningMechanicTicket(null);
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to assign mechanic:', err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Failed to update technician assignment.'));
    } finally {
      setIsAssigningMechanic(false);
    }
  };

  // Check-in Motorcycle (Rider physically arrived at the shop floor)
  const handleCheckInMotorcycle = async (ticket: InternalTicket) => {
    setUpdatingId(ticket.id);
    try {
      // Replace (not stack) any earlier check-in marker if staff check the unit in again
      const cleanedNotes = (ticket.notes || '')
        .replace('[BOOKING:PENDING_DROPOFF]', '')
        .replace(/\s*\|?\s*\[CHECKED_IN:[^\]]*\]/g, '')
        .trim();
      // Arrival marker so the missed-booking scan never expires a motorcycle that is already at the shop
      const checkInTag = `[CHECKED_IN: by ${currentStaffName} at ${new Date().toLocaleTimeString()}]`;
      const updates = {
        status: 'IN_PROGRESS',
        stage: 1,
        notes: cleanedNotes ? `${cleanedNotes} | ${checkInTag}` : checkInTag,
        // Arrived earlier than booked: the unit is on the floor today
        ...(ticket.dropoff_date && ticket.dropoff_date > todayDateStr ? { dropoff_date: todayDateStr } : {}),
      };

      const { data, error } = await db()
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 03_service_tickets.sql.');
      }

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'RIDER_CHECKIN',
        actor: currentStaffName,
        details: 'Rider arrived on site. Transferred from Scheduled Appointments to Active Shop Floor.',
        previousValue: ticket.status,
        newValue: 'IN_PROGRESS',
      });

      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });
      onRefresh();
      // Prompt lift dispatch modal right away so staff can put motorcycle on a bay
      onOpenDispatch(ticket);
    } catch (err: unknown) {
      console.error('Failed to check in motorcycle:', err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Failed to check in motorcycle.'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm Online Booking
  const handleConfirmBooking = async (ticket: InternalTicket) => {
    setUpdatingId(ticket.id);
    try {
      const result = await acceptOnlineBooking(ticket, currentStaffName);
      if (!result.success) throw new Error(result.error);
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to confirm booking:', err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Failed to confirm booking.'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Quick Advance Stage
  const handleQuickAdvanceStage = async (ticket: InternalTicket, nextStage: number) => {
    setUpdatingId(ticket.id);
    try {
      const updates = {
        stage: nextStage,
        status: nextStage === 5 ? 'READY_FOR_PICKUP' : 'IN_PROGRESS',
      };

      const { data, error } = await db()
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 03_service_tickets.sql.');
      }

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'STAGE_ADVANCE',
        actor: currentStaffName,
        details: `Stage advanced from Stage ${ticket.stage} to Stage ${nextStage}`,
        previousValue: `Stage ${ticket.stage}`,
        newValue: `Stage ${nextStage}`,
      });

      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to advance stage:', err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Failed to advance stage.'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Late Arrival Check-in
  const handleLateCheckIn = async (ticket: InternalTicket) => {
    try {
      setUpdatingId(ticket.id);
      const result = await adminLateCheckInOverride(ticket.id, currentStaffName);
      if (result.success) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'LATE_CHECKIN_OVERRIDE',
          actor: currentStaffName,
          details: 'Staff performed manual arrival override for late motorcycle.',
          previousValue: ticket.status,
          newValue: 'IN_PROGRESS',
        });
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to perform late check-in.');
      }
    } catch {
      toast.error('Network error while performing check-in.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Void / Cancel Confirmation
  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    const cleanReason = voidReason.trim();
    if (!cleanReason) {
      toast.error('Please specify a cancellation reason.');
      return;
    }

    setIsVoiding(true);
    try {
      const result = await cancelOrDeclineTicket(voidTarget, cleanReason, currentStaffName);
      if (!result.success) throw new Error(result.error);

      setVoidTarget(null);
      setVoidReason('');
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to void ticket:', err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Failed to void ticket.'));
    } finally {
      setIsVoiding(false);
    }
  };

  // Assisted Reschedule
  const handleConfirmAssistedReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) {
      toast.error('Please select a new appointment date.');
      return;
    }
    if (rescheduleDate < todayDateStr) {
      toast.error('Please pick today or a future date.');
      return;
    }
    if (isSundayDate(rescheduleDate)) {
      toast.error('The shop is closed on Sundays. Please pick Monday to Saturday.');
      return;
    }
    if (isArrivalWindowOver(rescheduleDate, rescheduleSlot)) {
      toast.error('That time slot has already ended today. Please pick a later slot or date.');
      return;
    }
    const bookedThatDay = tickets.filter(
      (t) =>
        t.id !== rescheduleTarget.id &&
        t.dropoff_date === rescheduleDate &&
        !['CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'].includes(t.status)
    ).length;
    if (bookedThatDay >= getDailyCapacityLimit(rescheduleDate)) {
      toast.error(`${rescheduleDate} is fully booked (${bookedThatDay} bookings). Please pick another date.`);
      return;
    }

    setIsRescheduling(true);
    const result = await adminAssistedReschedule(
      rescheduleTarget.id,
      rescheduleTarget.ticket_code,
      rescheduleDate,
      rescheduleSlot,
      currentStaffName
    );
    setIsRescheduling(false);

    if (result.success) {
      setRescheduleTarget(null);
      setRescheduleDate('');
      onRefresh();
    } else {
      toast.error(result.error || 'Failed to reschedule ticket.');
    }
  };

  // Elapsed time helper
  const getElapsedText = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const diffMins = Math.max(1, Math.floor((now - created) / 60000));

    if (diffMins < 60) {
      return `${diffMins}m in shop`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''} in shop`;
  };

  // ---- Renderers shared by every section (cards, board by stage, list) ----
  const renderBoard = (list: InternalTicket[]) => (
        <div className="p-4 sm:p-5 bg-slate-50/60 overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[minmax(13rem,1fr)] gap-3">
            {SERVICE_STAGES.map((st) => {
              const column = list.filter((t) => Math.min(Math.max(t.stage, 1), 5) === st.step);
              return (
                <section key={st.step} className="bg-slate-100/70 rounded-2xl p-2.5 flex flex-col gap-2 self-start">
                  <div className="flex items-center justify-between px-1.5 pt-1 pb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white text-[11px] font-bold text-slate-600 flex items-center justify-center shrink-0">
                        {st.step}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate" title={st.staffHint}>
                        {st.name}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">{column.length}</span>
                  </div>

                  {column.length === 0 ? (
                    <div className="h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                      Empty
                    </div>
                  ) : (
                    column.map((ticket) => {
                      const mechanic =
                        ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment'
                          ? ticket.assigned_mechanic
                          : null;
                      const bay =
                        ticket.assigned_bay && ticket.assigned_bay !== 'Bay Assignment Pending' ? ticket.assigned_bay : null;
                      const action =
                        ticket.stage <= 1
                          ? { label: 'Assign bay', run: () => onOpenDispatch(ticket) }
                          : ticket.stage < 4
                          ? { label: 'Next stage', run: () => handleQuickAdvanceStage(ticket, ticket.stage + 1) }
                          : ticket.stage === 4
                          ? { label: 'Mark ready', run: () => onOpenStage5Billing(ticket) }
                          : { label: 'Release', run: () => onOpenStage5Billing(ticket) };

                      return (
                        <div
                          key={ticket.id}
                          className="bg-white border border-slate-200/70 rounded-xl p-3 card-elevated space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span className="font-mono font-semibold text-slate-600">{ticket.ticket_code}</span>
                            <span>{getElapsedText(ticket.created_at).replace(' in shop', '')}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900 leading-snug">
                              {ticket.motorcycles?.model || 'Motorcycle'}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {ticket.motorcycles?.plate_number || 'No plate'}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2" title={ticket.service_type}>
                            {ticket.service_type}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-700">{bay || 'No bay'}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenAssignMechanic(ticket)}
                              className={`px-2 py-0.5 rounded-full text-[11px] transition cursor-pointer ${
                                mechanic
                                  ? 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700'
                                  : 'border border-dashed border-slate-300 text-slate-500 hover:border-orange-300 hover:text-orange-700'
                              }`}
                              title="Change mechanic"
                            >
                              {mechanic || '+ Mechanic'}
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={updatingId === ticket.id}
                            onClick={action.run}
                            className={`${PRIMARY_BTN_SM} w-full justify-center`}
                          >
                            {action.label}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </section>
              );
            })}
          </div>
        </div>
  );

  const renderTable = (list: InternalTicket[]) => (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500 font-medium text-xs">
                <tr>
                  <th className="py-3 px-4 sm:pl-6 font-medium">Ticket</th>
                  <th className="py-3 px-4 font-medium">Motorcycle</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Bay</th>
                  <th className="py-3 px-4 font-medium">Mechanic</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 sm:pr-6 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((ticket) => {
                  const isPending = isPendingOnlineBooking(ticket);
                  const isScheduled = isScheduledBooking(ticket);
                  const isCompleted = ticket.status === 'COMPLETED';
                  const parsedNotes = parseTicketNotes(ticket.notes);
                  const rawPhone = (ticket.customer_phone && !ticket.customer_phone.includes(',') && ticket.customer_phone !== 'N/A')
                    ? ticket.customer_phone
                    : parsedNotes.phone;
                  const displayPhone = rawPhone ? formatPhoneNumber(rawPhone) : 'N/A';
                  const customerName = ticket.customer_name || parsedNotes.customerName || 'Rider Customer';
                  const apptInfo = formatAppointmentDate(ticket.dropoff_date);
                  const bookedDate = formatBookingCreatedDate(ticket.created_at);

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 sm:pl-6 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {ticket.ticket_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {ticket.motorcycles?.model || 'Motorcycle'}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {ticket.motorcycles?.plate_number || 'No plate'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{customerName}</div>
                        {rawPhone && rawPhone !== 'N/A' ? (
                          <a href={`tel:${rawPhone}`} className="text-slate-500 hover:text-orange-600 font-mono text-[11px]">
                            {displayPhone}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No contact</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {apptInfo ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{apptInfo.label}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Booked: {bookedDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Booked: {bookedDate}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {ticket.assigned_bay && ticket.assigned_bay !== 'Bay Assignment Pending' ? (
                          <span className="font-medium text-slate-800 whitespace-nowrap">{ticket.assigned_bay}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignMechanic(ticket)}
                            className={`${CHIP} bg-slate-100 hover:bg-orange-50 text-slate-800 hover:text-orange-700 transition cursor-pointer`}
                            title="Change mechanic"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ticket.assigned_mechanic}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignMechanic(ticket)}
                            className={`${CHIP} border border-dashed border-slate-300 hover:border-orange-300 text-slate-500 hover:text-orange-700 transition cursor-pointer`}
                            title="Assign a mechanic"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>Assign</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isPending ? (
                          <StatusPill label="New request" tone="waiting" />
                        ) : isScheduled ? (
                          <StatusPill label="Scheduled" tone="waiting" />
                        ) : isCompleted ? (
                          <StatusPill label="Released" tone="done" />
                        ) : ticket.status === 'MISSED' || ticket.status === 'NO_SHOW' ? (
                          <StatusPill label="Missed" tone="missed" />
                        ) : ticket.status === 'CANCELLED' || ticket.status === 'CANCELLED_BY_ADMIN' ? (
                          <StatusPill label="Cancelled" tone="void" />
                        ) : (
                          <StatusPill label={`${ticket.stage} · ${stageName(ticket.stage)}`} tone="stage" />
                        )}
                      </td>
                      <td className="py-3 px-4 sm:pr-6 whitespace-nowrap">
                        <div className="flex justify-end">
                          {isPending ? (
                            <button type="button" onClick={() => handleConfirmBooking(ticket)} className={`${PRIMARY_BTN_SM}`}>
                              Accept
                            </button>
                          ) : isScheduled ? (
                            <button type="button" onClick={() => handleCheckInMotorcycle(ticket)} className={`${PRIMARY_BTN_SM}`}>
                              Check in
                            </button>
                          ) : isCompleted ? (
                            <div className="flex items-center gap-1">
                              {onOpenJobOrderPrint && (
                                <button
                                  type="button"
                                  onClick={() => onOpenJobOrderPrint(ticket)}
                                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition cursor-pointer"
                                >
                                  Job order
                                </button>
                              )}
                              {onOpenReceiptPrint && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceiptPrint(ticket)}
                                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition cursor-pointer"
                                >
                                  Gate pass
                                </button>
                              )}
                            </div>
                          ) : ticket.status === 'MISSED' || ticket.status === 'NO_SHOW' ? (
                            <button type="button" onClick={() => handleLateCheckIn(ticket)} className={PRIMARY_BTN_SM}>
                              Late check-in
                            </button>
                          ) : ticket.status === 'CANCELLED' || ticket.status === 'CANCELLED_BY_ADMIN' ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : ticket.stage === 1 ? (
                            <button type="button" onClick={() => onOpenDispatch(ticket)} className={`${PRIMARY_BTN_SM}`}>
                              Assign bay
                            </button>
                          ) : ticket.stage >= 2 && ticket.stage < 4 ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAdvanceStage(ticket, ticket.stage + 1)}
                              className={`${PRIMARY_BTN_SM}`}
                            >
                              Stage {ticket.stage + 1}
                            </button>
                          ) : (
                            <button type="button" onClick={() => onOpenStage5Billing(ticket)} className={`${PRIMARY_BTN_SM}`}>
                              {ticket.stage === 4 ? 'Mark ready' : 'Release'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
  );

  const renderTicketCard = (ticket: InternalTicket) => {
            const isPending = isPendingOnlineBooking(ticket);
            const isScheduled = isScheduledBooking(ticket);
            const isCompleted = ticket.status === 'COMPLETED';
            const isCancelled = ticket.status === 'CANCELLED' || ticket.status === 'CANCELLED_BY_ADMIN';
            const isMissed = ticket.status === 'MISSED' || ticket.status === 'NO_SHOW';
            // Motorcycle is in the shop (not a request, appointment, or closed ticket)
            const isActiveTicket = !isPending && !isScheduled && !isCompleted && !isCancelled && !isMissed;
            const isUpdating = updatingId === ticket.id;
            const elapsed = getElapsedText(ticket.created_at);
            const review = parseTicketReview(ticket.notes);
            const apptInfo = formatAppointmentDate(ticket.dropoff_date);
            const bookedDate = formatBookingCreatedDate(ticket.created_at);

            // Sanitized Notes & Customer Data
            const parsedNotes = parseTicketNotes(ticket.notes);
            const rawPhone = (ticket.customer_phone && !ticket.customer_phone.includes(',') && ticket.customer_phone !== 'N/A')
              ? ticket.customer_phone
              : parsedNotes.phone;
            const displayPhone = rawPhone ? formatPhoneNumber(rawPhone) : null;
            const customerName = ticket.customer_name || parsedNotes.customerName || 'Rider Customer';
            const arrivalWindow = ticket.dropoff_window || parsedNotes.arrivalWindow || null;
            const symptoms = parsedNotes.symptoms || null;

            return (
              <div
                key={ticket.id}
                className={`relative overflow-hidden bg-white border hover:border-slate-300 rounded-2xl sm:rounded-[1.5rem] p-5 card-elevated space-y-4 transition ${
                  isPending ? 'border-orange-300 ring-4 ring-orange-100' : 'border-slate-200/70'
                }`}
              >
                {/* Stage accent on the left edge: darker orange the closer it is to release */}
                {isActiveTicket && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 inset-y-0 w-1 ${STAGE_ACCENT[Math.min(Math.max(ticket.stage, 1), 5)]}`}
                  />
                )}

                {/* 1. Header: ticket number, motorcycle, plate, time, status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono font-semibold text-slate-700">{ticket.ticket_code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(ticket.ticket_code)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title="Copy ticket number"
                        aria-label="Copy ticket number"
                      >
                        {copiedCode === ticket.ticket_code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-slate-300">·</span>
                      {isScheduled && apptInfo ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {apptInfo.label}
                        </span>
                      ) : isPending || isCompleted || isCancelled || isMissed ? (
                        <span>Booked {bookedDate}</span>
                      ) : (
                        <span>{elapsed}</span>
                      )}
                      {ticket.is_walk_in && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>Walk-in</span>
                        </>
                      )}
                    </div>

                    <h3
                      className="mt-1 font-display text-base sm:text-[1.05rem] font-bold tracking-tight text-slate-900 leading-snug line-clamp-2"
                      title={ticket.motorcycles?.model || undefined}
                    >
                      {ticket.motorcycles?.model || 'Motorcycle'}
                      <span className="ml-2 inline-block align-middle font-mono text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                        {ticket.motorcycles?.plate_number || 'No plate'}
                      </span>
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {isPending ? (
                      <StatusPill label="New request" tone="waiting" />
                    ) : isScheduled ? (
                      <StatusPill label="Scheduled" tone="waiting" />
                    ) : isCompleted ? (
                      <StatusPill label="Released" tone="done" />
                    ) : isCancelled ? (
                      <StatusPill label="Cancelled" tone="void" />
                    ) : isMissed ? (
                      <StatusPill label="Missed" tone="missed" />
                    ) : (
                      <StatusPill label={`Stage ${ticket.stage} · ${stageName(ticket.stage)}`} tone="stage" />
                    )}
                  </div>
                </div>

                {/* 5-step repair progress (what the customer sees on their dashboard) */}
                {!isPending && !isScheduled && !isCompleted && !isCancelled && !isMissed && (
                  <div className="grid grid-cols-5 gap-1" aria-label={`Stage ${ticket.stage} of 5`}>
                    {SERVICE_STAGES.map((st) => (
                      <div key={st.step} className="space-y-1 min-w-0">
                        <div
                          className={`h-1.5 rounded-full ${
                            st.step < ticket.stage
                              ? 'bg-orange-300'
                              : st.step === ticket.stage
                              ? 'bg-orange-500'
                              : 'bg-slate-200'
                          }`}
                        />
                        <span
                          className={`block text-[11px] truncate ${
                            st.step === ticket.stage ? 'text-slate-900 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {st.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Customer, Phone, Schedule & Service Package Details */}
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3 border-t border-slate-100">
                  <div className="min-w-0">
                    <span className="block text-xs text-slate-400">Customer</span>
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{customerName}</span>
                      {displayPhone && (
                        <a
                          href={`tel:${rawPhone}`}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-orange-600 font-mono text-xs transition"
                          title="Call the customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {displayPhone}
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs text-slate-400">Service</span>
                    <span className="font-medium text-slate-900 block truncate">{ticket.service_type || 'General service'}</span>
                    {arrivalWindow && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Arrives {arrivalWindow}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. What the rider reported */}
                {symptoms && (
                  <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm">
                    <span className="block text-xs text-slate-400">Rider&apos;s concern</span>
                    <p className="text-slate-800 leading-relaxed">{symptoms}</p>
                  </div>
                )}

                {/* 4. Customer review (if any) */}
                {review && (
                  <div className="px-3.5 py-2.5 bg-amber-50/60 rounded-xl text-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-slate-700">{review.rating}/5</span>
                      </div>
                      {review.comment && <p className="text-slate-700 text-xs truncate mt-0.5">&ldquo;{review.comment}&rdquo;</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab?.('reviews')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 shrink-0 cursor-pointer"
                    >
                      Reviews →
                    </button>
                  </div>
                )}

                {/* 5. Footer Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  {/* Left: bay, mechanic, quick links */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ticket.assigned_bay && ticket.assigned_bay !== 'Bay Assignment Pending' ? (
                      <span className={`${CHIP} bg-slate-100 text-slate-800`}>
                        <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        {ticket.assigned_bay}
                      </span>
                    ) : !isPending && !isScheduled && !isCompleted && !isCancelled && !isMissed ? (
                      <span className={`${CHIP} bg-amber-50 text-amber-800`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No bay yet
                      </span>
                    ) : null}

                    {ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignMechanic(ticket)}
                        className={`${CHIP} bg-slate-100 hover:bg-orange-50 text-slate-800 hover:text-orange-700 transition cursor-pointer`}
                        title="Change mechanic"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        {ticket.assigned_mechanic}
                        <Edit className="w-3 h-3 text-slate-400" />
                      </button>
                    ) : !isCompleted && !isCancelled && !isMissed ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignMechanic(ticket)}
                        className={`${CHIP} border border-dashed border-slate-300 hover:border-orange-300 text-slate-500 hover:text-orange-700 transition cursor-pointer`}
                        title="Assign a mechanic"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Mechanic
                      </button>
                    ) : null}

                  </div>

                  {/* Right: small tools, then the main action for this ticket */}
                  <div className="flex items-center gap-2 justify-end sm:ml-auto">
                    <MoreMenu
                      items={[
                        ...(onNavigateTab
                          ? [{ label: 'Chat with customer', icon: MessageSquare, onClick: () => onNavigateTab('messages') }]
                          : []),
                        ...(ticket.motorcycles?.plate_number
                          ? [
                              {
                                label: 'Previous visits',
                                icon: History,
                                onClick: () =>
                                  setHistoryVehicle({
                                    plate_number: ticket.motorcycles?.plate_number || 'NO PLATE',
                                    model: ticket.motorcycles?.model || 'Motorcycle',
                                    year_model: ticket.motorcycles?.year_model || '2024',
                                    odometer: ticket.motorcycles?.odometer || '',
                                    owner_name: customerName,
                                    owner_phone: rawPhone || '',
                                  }),
                              },
                            ]
                          : []),
                        ...(isActiveTicket && ticket.is_walk_in
                          ? [{ label: 'Walk-in ticket slip', icon: Ticket, onClick: () => setClaimSlipTicket(ticket) }]
                          : []),
                        ...(isActiveTicket && onOpenJobOrderPrint
                          ? [{ label: 'Print job order', icon: Printer, onClick: () => onOpenJobOrderPrint(ticket) }]
                          : []),
                        ...(isActiveTicket && canVoidTicket(currentRole)
                          ? [{ label: 'Cancel ticket', icon: Trash2, onClick: () => setVoidTarget(ticket), danger: true }]
                          : []),
                      ]}
                    />

                  {isPending ? (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => setVoidTarget(ticket)}
                        className={`${SECONDARY_BTN} hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50`}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleConfirmBooking(ticket)}
                        className={PRIMARY_BTN}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept booking</span>
                      </button>
                    </div>
                  ) : isScheduled ? (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleTarget(ticket);
                          setRescheduleDate(ticket.dropoff_date || '');
                          setRescheduleSlot(ticket.dropoff_window || TIME_SLOTS[0]?.id || 'slot-1');
                        }}
                        className={SECONDARY_BTN}
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleCheckInMotorcycle(ticket)}
                        className={PRIMARY_BTN}
                        title="The rider is here with the motorcycle"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{apptInfo?.isToday ? 'Check in' : 'Check in early'}</span>
                      </button>
                    </div>
                  ) : !isCompleted && !isCancelled && !isMissed ? (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Walk-in: reprint the claim slip */}
                      {ticket.stage === 1 && (
                        <button type="button" onClick={() => onOpenDispatch(ticket)} className={PRIMARY_BTN}>
                          <Wrench className="w-4 h-4" />
                          <span>Assign bay</span>
                        </button>
                      )}

                      {ticket.stage >= 2 && ticket.stage < 4 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickAdvanceStage(ticket, ticket.stage + 1)}
                          className={PRIMARY_BTN}
                        >
                          <span>Move to stage {ticket.stage + 1}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {ticket.stage === 4 && (
                        <button type="button" onClick={() => onOpenStage5Billing(ticket)} className={PRIMARY_BTN}>
                          <KeyRound className="w-4 h-4" />
                          <span>Mark ready</span>
                        </button>
                      )}

                      {ticket.stage === 5 && (
                        <button type="button" onClick={() => onOpenStage5Billing(ticket)} className={PRIMARY_BTN}>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Release</span>
                        </button>
                      )}
                    </div>
                  ) : null}

                  {isCompleted && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {onOpenJobOrderPrint && (
                        <button type="button" onClick={() => onOpenJobOrderPrint(ticket)} className={SECONDARY_BTN}>
                          <Printer className="w-4 h-4 text-slate-400" />
                          <span>Job order</span>
                        </button>
                      )}
                      {onOpenReceiptPrint && (
                        <button type="button" onClick={() => onOpenReceiptPrint(ticket)} className={SECONDARY_BTN}>
                          <Printer className="w-4 h-4 text-slate-400" />
                          <span>Gate pass</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isMissed && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button type="button" onClick={() => setRescheduleTarget(ticket)} className={SECONDARY_BTN}>
                        Reschedule
                      </button>
                      <button type="button" onClick={() => handleLateCheckIn(ticket)} className={PRIMARY_BTN}>
                        Late check-in
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            );
  };

  const renderCardGrid = (list: InternalTicket[]) => (
    <div className={`grid gap-4 ${list.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
      {list.map((ticket) => renderTicketCard(ticket))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Toolbar: one search for every section, the day's summary, and New walk-in */}
      <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticket, customer, phone or plate"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-full pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="button" onClick={() => setIsWalkInModalOpen(true)} className={`self-start sm:self-auto shrink-0 ${PRIMARY_BTN}`}>
            <Plus className="w-4 h-4" />
            <span>New walk-in</span>
          </button>
        </div>
        {/* Day summary: tap a pill to jump to that section */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { id: 'q-needs', label: 'Needs action', count: sections.needsAction.length, alert: sections.needsAction.length > 0 },
            { id: 'q-shop', label: 'In the shop', count: sections.inShop.length, alert: false },
            { id: 'q-upcoming', label: 'Upcoming', count: sections.upcoming.length, alert: false },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              disabled={pill.count === 0}
              onClick={() => document.getElementById(pill.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full text-sm transition ${
                pill.alert
                  ? 'bg-orange-50 text-orange-800 hover:bg-orange-100 cursor-pointer'
                  : pill.count > 0
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 cursor-default'
              }`}
            >
              {pill.label}
              <span
                className={`min-w-[22px] px-1.5 rounded-full text-xs font-semibold leading-5 text-center tabular-nums ${
                  pill.alert ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {searchQuery.trim() && totalShown === 0 && (
        <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated px-6 py-12 text-center">
          <h3 className="font-display text-base font-bold text-slate-900">No tickets match your search</h3>
          <p className="text-sm text-slate-500 mt-1">Try another plate, name, or ticket number.</p>
        </div>
      )}

      {/* 1. Needs your action: new booking requests + riders arriving today */}
      {sections.needsAction.length > 0 && (
        <section
          id="q-needs"
          className="scroll-mt-28 rounded-2xl sm:rounded-[1.75rem] border border-slate-200/70 bg-white card-elevated p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-start gap-3 px-1">
            <span className="w-10 h-10 rounded-[12px] bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
              <BellRing className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                Needs your action <span className="text-orange-600">({sections.needsAction.length})</span>
              </h2>
              <p className="text-sm text-slate-500">
                {[
                  sections.pending.length > 0 &&
                    `${sections.pending.length} new booking request${sections.pending.length === 1 ? '' : 's'} to accept or decline`,
                  sections.arrivingToday.length > 0 &&
                    `${sections.arrivingToday.length} rider${sections.arrivingToday.length === 1 ? '' : 's'} arriving today to check in`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          {renderCardGrid(sections.needsAction)}
        </section>
      )}

      {/* 2. In the shop: board by stage (default), cards, or list */}
      <section
        id="q-shop"
        className="scroll-mt-28 bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated overflow-clip"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                In the shop <span className="text-slate-400 font-semibold">({sections.inShop.length})</span>
              </h2>
              <p className="text-sm text-slate-500">Motorcycles being worked on, by repair stage</p>
            </div>
          </div>
          <div className="flex items-center p-1 bg-slate-100 rounded-full shrink-0" role="group" aria-label="Layout">
            {(
              [
                { id: 'board', label: 'Board', icon: Kanban },
                { id: 'grid', label: 'Cards', icon: LayoutGrid },
                { id: 'table', label: 'List', icon: List },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const selected = viewLayout === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setViewLayout(opt.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    selected ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {sections.inShop.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto">
              <MotorcycleIcon className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 mt-4">
              {searchQuery.trim() ? 'No match in the shop' : 'No motorcycles in the shop'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery.trim()
                ? 'Try another plate, name, or ticket number.'
                : sections.arrivingToday.length > 0
                ? 'Check in a rider above when they arrive, or start a walk-in.'
                : 'Walk-ins and checked-in bookings show up here.'}
            </p>
            {!searchQuery.trim() && (
              <button type="button" onClick={() => setIsWalkInModalOpen(true)} className={`mt-5 mx-auto ${PRIMARY_BTN}`}>
                <Plus className="w-4 h-4" />
                <span>New walk-in</span>
              </button>
            )}
          </div>
        ) : viewLayout === 'board' ? (
          renderBoard(sections.inShop)
        ) : viewLayout === 'table' ? (
          renderTable(sections.inShop)
        ) : (
          <div className="p-4 sm:p-5 bg-slate-50/60">{renderCardGrid(sections.inShop)}</div>
        )}
      </section>

      {/* 3. Upcoming: accepted bookings for the next days */}
      {sections.upcoming.length > 0 && (
        <section
          id="q-upcoming"
          className="scroll-mt-28 bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-start gap-3 px-1">
            <span className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                Upcoming <span className="text-slate-400 font-semibold">({sections.upcoming.length})</span>
              </h2>
              <p className="text-sm text-slate-500">Accepted bookings for the next days, earliest first</p>
            </div>
          </div>
          {renderCardGrid(sections.upcoming)}
        </section>
      )}

      {/* 4. History: released and cancelled / missed, opened on demand */}
      <section className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-4 sm:p-5 overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">History</h2>
              <p className="text-sm text-slate-500">Released motorcycles and closed bookings</p>
            </div>
          </div>
          <div className="flex items-center p-1 bg-slate-100 rounded-full" role="group" aria-label="History">
            {(
              [
                { id: 'released', label: 'Released', icon: CheckCircle2, count: sections.released.length },
                { id: 'closed', label: 'Cancelled / Missed', icon: CircleX, count: sections.closed.length },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const selected = historyView === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHistoryView(selected ? null : opt.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    selected ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                  <span className="tabular-nums text-slate-400">{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Past tickets as a compact list: one line each */}
        {historyView && (
          <div className="mt-4 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 border-t border-slate-100">
            {(historyView === 'released' ? sections.released : sections.closed).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nothing here yet.</p>
            ) : (
              renderTable(historyView === 'released' ? sections.released : sections.closed)
            )}
          </div>
        )}
      </section>

      {/* Walk-in Claim Slip */}
      <WalkInClaimSlipModal
        slip={
          claimSlipTicket
            ? {
                ticketCode: claimSlipTicket.ticket_code,
                customerName:
                  claimSlipTicket.customer_name || parseTicketNotes(claimSlipTicket.notes).customerName || 'Walk-in Customer',
                bikeModel: claimSlipTicket.motorcycles?.model || 'Motorcycle',
                plateNumber: claimSlipTicket.motorcycles?.plate_number || 'NO PLATE',
                serviceType: claimSlipTicket.service_type,
                createdAt: claimSlipTicket.created_at,
              }
            : null
        }
        onClose={() => setClaimSlipTicket(null)}
      />

      {/* New Walk-in Ticket Modal */}
      {isWalkInModalOpen && (
        <NewWalkInTicketModal
          isOpen={isWalkInModalOpen}
          onClose={() => setIsWalkInModalOpen(false)}
          onTicketCreated={() => {
            onRefresh();
            setIsWalkInModalOpen(false);
          }}
          currentStaffName={currentStaffName}
        />
      )}

      {/* Vehicle Service History Modal */}
      {historyVehicle && (
        <VehicleHistoryModal
          isOpen={!!historyVehicle}
          onClose={() => setHistoryVehicle(null)}
          tickets={tickets}
          vehicle={historyVehicle}
        />
      )}


      {/* Soft Cancellation / Void Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isPendingOnlineBooking(voidTarget) ? 'Decline Online Booking' : 'Cancel & Void Service Ticket'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ticket <strong className="text-orange-600 font-mono">#{voidTarget.ticket_code}</strong> • {voidTarget.customer_name}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Reason for Cancellation
              </label>
              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Customer cancelled via call, no available parts in stock, customer duplicate booking..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                disabled={isVoiding}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold cursor-pointer"
              >
                Keep Ticket
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isVoiding}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {isVoiding ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assisted Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Assisted Reschedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ticket <strong className="text-orange-600 font-mono">#{rescheduleTarget.ticket_code}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">New Appointment Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={todayDateStr}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 transition"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                disabled={isRescheduling}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssistedReschedule}
                disabled={isRescheduling}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign Mechanic Modal */}
      {assigningMechanicTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Assign Mechanic
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ticket <strong className="text-orange-600 font-mono">#{assigningMechanicTicket.ticket_code}</strong> • {assigningMechanicTicket.motorcycles?.model || 'Motorcycle Unit'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningMechanicTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mechanics don't have accounts: type the name */}
            <form
              id="assign-mechanic-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveMechanicAssignment();
              }}
              className="space-y-1.5"
            >
              <label htmlFor="assign-mechanic-name" className="text-xs font-bold text-slate-700 block">
                Mechanic name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="assign-mechanic-name"
                  type="text"
                  autoFocus
                  value={selectedMechanicName}
                  onChange={(e) => setSelectedMechanicName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400">Leave empty and save to remove the mechanic from this job.</p>
            </form>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedMechanicName('');
                }}
                disabled={isAssigningMechanic || !selectedMechanicName}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-40"
              >
                Clear
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningMechanicTicket(null)}
                  disabled={isAssigningMechanic}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="assign-mechanic-form"
                  disabled={isAssigningMechanic}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {isAssigningMechanic ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default InternalQueueTab;
