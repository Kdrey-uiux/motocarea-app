import { useState, useMemo, useCallback, useEffect, useRef, type ComponentProps } from 'react';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { InternalTicket, UserRole } from '../types/internal';
import { canVoidTicket } from '../utils/permissions';
import { acceptOnlineBooking, advanceTicketStage, isPendingOnlineBooking, lateCheckIn } from '../utils/ticketActions';
import {
  adminAssistedReschedule,
  isArrivalWindowOver,
  TIME_SLOTS
} from '../../utils/bookingLifecycle';
import { getDailyCapacityLimit, isSundayDate } from '../../utils/workshopCapacity';
import { useNow } from '../hooks/useNow';
import { normalizeBayNumber } from '../utils/bays';
import { useBayCount } from '../../utils/workshopBays';
import { SERVICE_STAGES, stageName } from '../../utils/serviceStages';
import { 
  Ticket,
  Search, 
  Wrench, 
  ChevronRight, 
  Printer, 
  Copy,
  Phone,
  Check, 
  Trash2, 
  Plus, 
  User,
  KeyRound,
  CheckCircle2,
  History,
  MessageSquare,
  UserCheck,
  Edit,
  X,
  MoreHorizontal,
  CalendarClock,
  type LucideIcon,
} from '../../components/icons';
import NewWalkInTicketModal from '../modals/NewWalkInTicketModal';
import WalkInClaimSlipModal from '../modals/WalkInClaimSlipModal';
import VehicleHistoryModal from '../modals/VehicleHistoryModal';
import CancelTicketModal from '../modals/CancelTicketModal';
import { parseTicketNotes, formatPhoneNumber } from '../../utils/ticketNotesParser';
import { InternalStaffMember } from '../types/internal';
import { toast } from '../utils/toast';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

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
  onOpenJobOrderPrint?: (ticket: InternalTicket) => void;
  currentRole: UserRole;
  currentStaffName?: string;
  onOpenHardcopyModal?: () => void;
  pendingHardcopyCount?: number;
  /** Opens this rider's conversation in Messages */
  onOpenChat?: (userId: string) => void;
  staffList?: InternalStaffMember[];
  /** View to open first (e.g. 'PENDING' when coming from the Dashboard) */
  initialView?: OperationalView;
}

type QueueTab = 'todo' | 'shop' | 'upcoming';

export type OperationalView = 'ACTIVE' | 'SCHEDULED' | 'PENDING' | 'READY_RELEASE' | 'COMPLETED' | 'MISSED';

// Shared button looks (same as the staff Dashboard)
const PRIMARY_BTN =
  'px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5';
const ROW_BTN =
  'px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap';
const SECONDARY_BTN =
  'px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5';
const ICON_BTN = 'w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer';

const formatArrivalWindow = (windowText: string) => windowText.replace(/^0/, '').replace(/ - 0?/, ' – ');

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
          className="absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 z-20 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 animate-in fade-in zoom-in-95 duration-100"
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

export function InternalQueueTab({
  tickets,
  loading: _loading,
  onRefresh,
  onOpenDispatch,
  onOpenStage5Billing,
  onOpenJobOrderPrint,
  currentRole,
  currentStaffName = 'Workshop Staff',
  onOpenChat,
  initialView,
}: InternalQueueTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals state
  const [historyVehicle, setHistoryVehicle] = useState<ComponentProps<typeof VehicleHistoryModal>['vehicle'] | null>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  // Walk-in claim slip (ticket number + creation date the customer needs to track online)
  const [claimSlipTicket, setClaimSlipTicket] = useState<InternalTicket | null>(null);

  // Soft Cancellation Void Modal State
  const [voidTarget, setVoidTarget] = useState<InternalTicket | null>(null);

  // Assisted Reschedule State
  const [rescheduleTarget, setRescheduleTarget] = useState<InternalTicket | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(TIME_SLOTS[0]?.id || 'slot-1');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // One list at a time. Until a tab is picked: what needs doing, or else the shop floor.
  const [chosenTab, setChosenTab] = useState<QueueTab | null>(
    initialView === 'READY_RELEASE' ? 'shop' : initialView === 'PENDING' ? 'todo' : null
  );

  // Coming from the Dashboard: go straight to what was tapped
  const focusedViewRef = useRef<OperationalView | undefined>(undefined);
  useEffect(() => {
    if (!initialView || focusedViewRef.current === initialView) return;
    focusedViewRef.current = initialView;
    const readyTicket = tickets.find((t) => t.status === 'READY_FOR_PICKUP');
    const target = initialView === 'READY_RELEASE' && readyTicket ? document.getElementById(`ticket-${readyTicket.id}`) : null;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-4', 'ring-orange-300');
    window.setTimeout(() => target.classList.remove('ring-4', 'ring-orange-300'), 2000);
  }, [initialView, tickets]);

  // Mechanic Quick Assign Modal State
  const [assigningMechanicTicket, setAssigningMechanicTicket] = useState<InternalTicket | null>(null);
  const [selectedMechanicName, setSelectedMechanicName] = useState<string>('');
  const [isAssigningMechanic, setIsAssigningMechanic] = useState(false);

  const now = useNow();

  const bayCount = useBayCount();

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${code} copied.`);
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

    const pending = tickets.filter((t) => isPendingOnlineBooking(t) && !isClosed(t) && matchesSearch(t));
    const arrivingToday = todaysArrivals.filter(matchesSearch);
    // Waiting for a bay first (they need something), then in bay order, so lines don't jump around
    const bayOrder = (t: InternalTicket) =>
      normalizeBayNumber(t.assigned_bay === 'Bay Assignment Pending' ? null : t.assigned_bay) ?? 0;
    const inShop = tickets
      .filter((t) => isActiveFloorTicket(t) && matchesSearch(t))
      .sort((a, b) => bayOrder(a) - bayOrder(b));
    const upcoming = tickets
      .filter((t) => isScheduledBooking(t) && t.dropoff_date !== todayDateStr && matchesSearch(t))
      .sort(byDate);
    // Riders who missed today's slot can still show up. Older ones are in History.
    const missedToday = tickets.filter(
      (t) => (t.status === 'MISSED' || t.status === 'NO_SHOW') && t.dropoff_date === todayDateStr && matchesSearch(t)
    );

    return { pending, arrivingToday, missedToday, needsAction: [...pending, ...arrivingToday, ...missedToday], inShop, upcoming };
  }, [tickets, todaysArrivals, matchesSearch, isActiveFloorTicket, isScheduledBooking, todayDateStr]);

  const baysInUse = sections.inShop.filter(
    (t) => normalizeBayNumber(t.assigned_bay === 'Bay Assignment Pending' ? null : t.assigned_bay)
  ).length;

  const totalShown =
    sections.needsAction.length +
    sections.inShop.length +
    sections.upcoming.length;

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
        throw new Error("This ticket could not be saved. It may have just changed, or your account can't edit it. Refresh and try again.");
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
        throw new Error("This ticket could not be saved. It may have just changed, or your account can't edit it. Refresh and try again.");
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
      // Next step right away: put the motorcycle on a bay
      onOpenDispatch({ ...ticket, ...updates });
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
      toast.success(`#${ticket.ticket_code} accepted. Check it in when the rider arrives.`);
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to confirm booking:', err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Failed to confirm booking.'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Next repair stage. Stage 5 tells the rider the motorcycle is ready for pickup.
  const handleAdvanceStage = async (ticket: InternalTicket, nextStage: number) => {
    setUpdatingId(ticket.id);
    const result = await advanceTicketStage(ticket, nextStage, currentStaffName);
    setUpdatingId(null);
    if (!result.success) {
      toast.error('Error: ' + (result.error || 'Failed to advance stage.'));
      return;
    }
    if (nextStage === 5) toast.success(`#${ticket.ticket_code} marked ready for pickup.`);
    onRefresh();
  };

  // Late Arrival Check-in
  const handleLateCheckIn = async (ticket: InternalTicket) => {
    try {
      setUpdatingId(ticket.id);
      const result = await lateCheckIn(ticket, currentStaffName);
      if (result.success) {
        onRefresh();
        onOpenDispatch({ ...ticket, stage: 1, status: 'IN_PROGRESS' });
      } else {
        toast.error(result.error || 'Failed to perform late check-in.');
      }
    } catch {
      toast.error('Network error while performing check-in.');
    } finally {
      setUpdatingId(null);
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

  // The one next step for a motorcycle in the shop, the same on the board and the cards
  const getNextAction = (ticket: InternalTicket) => {
    if (ticket.stage <= 1) return { label: 'Assign bay', icon: Wrench, run: () => onOpenDispatch(ticket) };
    if (ticket.stage < 4) {
      return {
        label: `Move to ${stageName(ticket.stage + 1)}`,
        icon: ChevronRight,
        run: () => handleAdvanceStage(ticket, ticket.stage + 1),
      };
    }
    if (ticket.stage === 4) return { label: 'Mark ready', icon: KeyRound, run: () => handleAdvanceStage(ticket, 5) };
    return { label: 'Release', icon: CheckCircle2, run: () => onOpenStage5Billing(ticket) };
  };

  // Less-used tools for a ticket, the same on the board and the cards
  const getMenuItems = (ticket: InternalTicket): MoreMenuItem[] => {
    const isClosed = ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'].includes(ticket.status);
    const isActive = !isPendingOnlineBooking(ticket) && !isScheduledBooking(ticket) && !isClosed;
    const notes = parseTicketNotes(ticket.notes);
    const phone = ticket.customer_phone && !ticket.customer_phone.includes(',') && ticket.customer_phone !== 'N/A'
      ? ticket.customer_phone
      : notes.phone;
    const isMissed = ticket.status === 'MISSED' || ticket.status === 'NO_SHOW';
    return [
      ...(isScheduledBooking(ticket) || isMissed
        ? [
            {
              label: 'Reschedule',
              icon: CalendarClock,
              onClick: () => {
                setRescheduleTarget(ticket);
                setRescheduleDate(isMissed ? '' : ticket.dropoff_date || '');
                setRescheduleSlot(ticket.dropoff_window || TIME_SLOTS[0]?.id || 'slot-1');
              },
            },
          ]
        : []),
      ...(isActive && ticket.stage >= 2
        ? [{ label: 'Update job', icon: Edit, onClick: () => onOpenDispatch(ticket) }]
        : []),
      // Walk-ins have no account to chat with
      ...(onOpenChat && ticket.user_id
        ? [{ label: 'Chat with customer', icon: MessageSquare, onClick: () => onOpenChat(ticket.user_id as string) }]
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
                  owner_name: ticket.customer_name || notes.customerName || 'Rider Customer',
                  owner_phone: phone || '',
                }),
            },
          ]
        : []),
      ...(isActive && ticket.is_walk_in
        ? [{ label: 'Walk-in ticket slip', icon: Ticket, onClick: () => setClaimSlipTicket(ticket) }]
        : []),
      ...(isActive && onOpenJobOrderPrint
        ? [{ label: 'Print job order', icon: Printer, onClick: () => onOpenJobOrderPrint(ticket) }]
        : []),
      ...(phone
        ? [{ label: `Call ${formatPhoneNumber(phone)}`, icon: Phone, onClick: () => { window.location.href = `tel:${phone}`; } }]
        : []),
      { label: `Copy ${ticket.ticket_code}`, icon: Copy, onClick: () => handleCopyCode(ticket.ticket_code) },
      ...(isActive && canVoidTicket(currentRole)
        ? [{ label: 'Cancel ticket', icon: Trash2, onClick: () => setVoidTarget(ticket), danger: true }]
        : []),
    ];
  };

  // Every ticket looks the same: where it is, what it is, how far along, and the next step
  const renderTicketRow = (ticket: InternalTicket) => {
    const isPending = isPendingOnlineBooking(ticket);
    const isMissed = ticket.status === 'MISSED' || ticket.status === 'NO_SHOW';
    const isScheduled = !isPending && !isMissed && isScheduledBooking(ticket);
    const isInShop = !isPending && !isMissed && !isScheduled;
    const isUpdating = updatingId === ticket.id;

    const notes = parseTicketNotes(ticket.notes);
    const customerName = ticket.customer_name || notes.customerName || 'Rider Customer';
    const arrivalWindow = ticket.dropoff_window || notes.arrivalWindow || null;
    const appt = formatAppointmentDate(ticket.dropoff_date);
    const bayNumber = normalizeBayNumber(ticket.assigned_bay === 'Bay Assignment Pending' ? null : ticket.assigned_bay);
    const mechanic =
      ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment' ? ticket.assigned_mechanic : null;
    const dropoff = ticket.dropoff_date ? new Date(`${ticket.dropoff_date}T00:00:00`) : null;
    const whenText =
      isScheduled && appt && !appt.isPast
        ? appt.isToday
          ? null
          : appt.diffDays === 1
            ? 'Tomorrow'
            : `In ${appt.diffDays} days`
        : appt?.label;
    const scheduleText = [whenText, arrivalWindow && formatArrivalWindow(arrivalWindow)].filter(Boolean).join(' · ');

    const tileBase = 'w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 leading-none';
    const tile = isInShop ? (
      bayNumber ? (
        <span className={`${tileBase} bg-orange-50 text-orange-700`}>
          <span className="text-[10px] font-medium text-orange-600">Bay</span>
          <span className="font-display text-lg font-bold">{String(bayNumber).padStart(2, '0')}</span>
        </span>
      ) : (
        <span className={`${tileBase} bg-amber-50 text-amber-800 text-[11px] font-semibold leading-tight`}>No bay</span>
      )
    ) : isPending ? (
      <span className={`${tileBase} bg-amber-50 text-amber-800 text-xs font-semibold`}>New</span>
    ) : isMissed ? (
      <span className={`${tileBase} bg-rose-50 text-rose-700 text-[11px] font-semibold`}>Missed</span>
    ) : appt?.isToday ? (
      <span className={`${tileBase} bg-orange-50 text-orange-700 text-xs font-semibold`}>Today</span>
    ) : (
      <span className={`${tileBase} bg-slate-100 text-slate-700`}>
        <span className="text-[10px] font-medium text-slate-500">
          {dropoff?.toLocaleDateString('en-US', { month: 'short' })}
        </span>
        <span className="font-display text-lg font-bold">{dropoff?.getDate()}</span>
      </span>
    );

    const nextAction = isInShop ? getNextAction(ticket) : null;
    const NextIcon = nextAction?.icon;

    return (
      <li
        key={ticket.id}
        id={`ticket-${ticket.id}`}
        className="scroll-mt-28 px-4 sm:px-6 py-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] xl:items-center gap-3.5 xl:gap-8 transition"
      >
        <div className="flex items-start gap-3 min-w-0">
          {tile}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 leading-snug truncate" title={ticket.motorcycles?.model || undefined}>
              {ticket.motorcycles?.model || 'Motorcycle'}
            </p>
            <p className="mt-0.5 text-sm text-slate-700 truncate">
              <span className="font-medium">{ticket.motorcycles?.plate_number || 'No plate'}</span>
              <span className="text-slate-400"> · </span>
              {customerName}
            </p>
            <p className="mt-0.5 text-sm text-slate-500 truncate" title={ticket.service_type || undefined}>
              {ticket.service_type || 'General service'}
              {ticket.is_walk_in && ` · Walk-in, ${getElapsedText(ticket.created_at)}`}
            </p>
          </div>
        </div>

        {isInShop ? (
          <div className="grid grid-cols-5 gap-1 min-w-0" aria-label={`Stage ${ticket.stage} of 5: ${stageName(ticket.stage)}`}>
            {SERVICE_STAGES.map((st) => (
              <div key={st.step} className="space-y-1 min-w-0">
                <div
                  className={`h-2 rounded-full ${
                    st.step < ticket.stage ? 'bg-orange-200' : st.step === ticket.stage ? 'bg-orange-500' : 'bg-slate-100'
                  }`}
                />
                <span className={`block text-xs truncate ${st.step === ticket.stage ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                  {st.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-w-0 text-sm">
            {scheduleText && <p className="font-medium text-slate-800">{scheduleText}</p>}
            {notes.symptoms && (
              <p className="mt-0.5 text-slate-600 truncate" title={notes.symptoms}>
                {notes.symptoms}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
          {isInShop ? (
            <button
              type="button"
              onClick={() => handleOpenAssignMechanic(ticket)}
              className={`${CHIP} max-w-[10rem] transition cursor-pointer ${
                mechanic
                  ? 'bg-slate-100 hover:bg-orange-50 text-slate-800 hover:text-orange-700'
                  : 'border border-dashed border-slate-300 hover:border-orange-300 text-slate-500 hover:text-orange-700'
              }`}
              title={mechanic ? 'Change mechanic' : 'Assign a mechanic'}
            >
              {mechanic ? <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{mechanic || 'Mechanic'}</span>
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 ml-auto xl:ml-0">
            <MoreMenu items={getMenuItems(ticket)} />
            {isPending && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setVoidTarget(ticket)}
                className={`${SECONDARY_BTN} hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50`}
              >
                Decline
              </button>
            )}
            {isPending ? (
              <button type="button" disabled={isUpdating} onClick={() => handleConfirmBooking(ticket)} className={ROW_BTN}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept</span>
              </button>
            ) : isMissed ? (
              <button type="button" disabled={isUpdating} onClick={() => handleLateCheckIn(ticket)} className={`${ROW_BTN} xl:min-w-[10rem]`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Late check-in</span>
              </button>
            ) : isScheduled ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleCheckInMotorcycle(ticket)}
                className={
                  appt?.isToday
                    ? `${ROW_BTN} xl:min-w-[10rem]`
                    : `${SECONDARY_BTN} justify-center whitespace-nowrap disabled:opacity-50 hover:text-orange-700 hover:border-orange-200 hover:bg-orange-50 xl:min-w-[10rem]`
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{appt?.isToday ? 'Check in' : 'Check in early'}</span>
              </button>
            ) : (
              nextAction &&
              NextIcon && (
                <button type="button" disabled={isUpdating} onClick={nextAction.run} className={`${ROW_BTN} xl:min-w-[10rem]`}>
                  <NextIcon className="w-4 h-4" />
                  <span>{nextAction.label}</span>
                </button>
              )
            )}
          </div>
        </div>
      </li>
    );
  };

  const isSearching = searchQuery.trim().length > 0;
  const activeTab: QueueTab = chosenTab ?? (sections.needsAction.length > 0 ? 'todo' : 'shop');
  const tabs: { id: QueueTab; label: string; list: InternalTicket[]; title: string; hint: string; emptyTitle: string; emptyHint: string }[] = [
    {
      id: 'todo',
      label: 'To do',
      list: sections.needsAction,
      title: 'To do',
      hint:
        [
          sections.pending.length > 0 && `${sections.pending.length} to accept or decline`,
          sections.arrivingToday.length > 0 && `${sections.arrivingToday.length} arriving today`,
          sections.missedToday.length > 0 && `${sections.missedToday.length} missed today`,
        ]
          .filter(Boolean)
          .join(' · ') || 'Nothing to do right now',
      emptyTitle: 'All caught up',
      emptyHint: 'New booking requests and riders arriving today show up here.',
    },
    {
      id: 'shop',
      label: 'In the shop',
      list: sections.inShop,
      title: 'In the shop',
      hint: `${baysInUse} of ${bayCount} bays in use${sections.inShop.length > baysInUse ? ` · ${sections.inShop.length - baysInUse} waiting for a bay` : ''}`,
      emptyTitle: 'No motorcycles in the shop',
      emptyHint: 'Walk-ins and checked-in bookings show up here.',
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      list: sections.upcoming,
      title: 'Upcoming',
      hint: 'Accepted bookings, earliest first',
      emptyTitle: 'No upcoming bookings',
      emptyHint: 'Bookings you accept for later dates show up here.',
    },
  ];
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const shownTickets = isSearching ? [...sections.needsAction, ...sections.inShop, ...sections.upcoming] : currentTab.list;

  return (
    <div className="space-y-5">
      {/* Toolbar: search, New walk-in, and the three lists */}
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
        {/* One list at a time */}
        {!isSearching && (
          <div className="mt-3 grid grid-cols-3 gap-1 p-1 rounded-full bg-slate-100" role="tablist" aria-label="Queue">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const needsAttention = tab.id === 'todo' && tab.list.length > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setChosenTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 px-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    isActive ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <span
                    className={`min-w-[20px] px-1 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums shrink-0 ${
                      needsAttention ? 'bg-orange-500 text-white' : 'bg-slate-200/70 text-slate-600 max-[359px]:hidden'
                    }`}
                  >
                    {tab.list.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
            {isSearching ? 'Search results' : currentTab.title}
          </h2>
          <p className="text-sm text-slate-500">
            {isSearching ? `${totalShown} ${totalShown === 1 ? 'ticket' : 'tickets'} found` : currentTab.hint}
          </p>
        </div>

        {shownTickets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto">
              <MotorcycleIcon className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900 mt-4">
              {isSearching ? 'No tickets match your search' : currentTab.emptyTitle}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {isSearching ? 'Try another plate, name, or ticket number.' : currentTab.emptyHint}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">{shownTickets.map(renderTicketRow)}</ul>
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


      {/* Decline a booking or cancel a ticket, with a reason */}
      {voidTarget && (
        <CancelTicketModal
          ticket={voidTarget}
          currentStaffName={currentStaffName}
          onClose={() => setVoidTarget(null)}
          onDone={onRefresh}
        />
      )}

      {/* Reschedule a booking for the rider */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <ScrollLock />
          <div className="bg-white rounded-[1.75rem] p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Reschedule booking</h3>
              <p className="text-sm text-slate-500">
                <span className="font-mono">#{rescheduleTarget.ticket_code}</span>
                {rescheduleTarget.customer_name ? ` · ${rescheduleTarget.customer_name}` : ''}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reschedule-date" className="text-sm font-semibold text-slate-800 block">
                New date
              </label>
              <input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={todayDateStr}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-800 block">Arrival time</span>
              <div className="space-y-1.5" role="group" aria-label="Arrival time">
                {TIME_SLOTS.map((slot) => {
                  const selected = rescheduleSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRescheduleSlot(slot.id)}
                      className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                        selected
                          ? 'border-orange-500 bg-orange-50 font-semibold text-orange-700'
                          : 'border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {slot.id}
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                disabled={isRescheduling}
                className={SECONDARY_BTN}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssistedReschedule}
                disabled={isRescheduling}
                className={PRIMARY_BTN}
              >
                {isRescheduling ? 'Saving…' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set the mechanic's name */}
      {assigningMechanicTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <ScrollLock />
          <div className="bg-white rounded-[1.75rem] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Mechanic</h3>
              <p className="text-sm text-slate-500 break-words">
                {assigningMechanicTicket.motorcycles?.model || 'Motorcycle'}
                <span className="font-mono"> · {assigningMechanicTicket.ticket_code}</span>
              </p>
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
              <label htmlFor="assign-mechanic-name" className="text-sm font-semibold text-slate-800 block">
                Name
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                />
              </div>
              <p className="text-xs text-slate-400">Leave it empty and save to remove the mechanic.</p>
            </form>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAssigningMechanicTicket(null)}
                disabled={isAssigningMechanic}
                className={SECONDARY_BTN}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="assign-mechanic-form"
                disabled={isAssigningMechanic}
                className={PRIMARY_BTN}
              >
                {isAssigningMechanic ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default InternalQueueTab;
