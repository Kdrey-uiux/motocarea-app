import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { InternalTicket, UserRole, InternalTab } from '../types/internal';
import { canVoidTicket } from '../utils/permissions';
import {
  adminLateCheckInOverride,
  adminAssistedReschedule,
  TIME_SLOTS
} from '../../utils/bookingLifecycle';
import { 
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
  Stamp,
  History,
  Star,
  MessageSquare,
  Clock,
  LayoutGrid,
  List,
  Calendar,
  UserCheck,
  Edit,
  X
} from 'lucide-react';
import NewWalkInTicketModal from '../modals/NewWalkInTicketModal';
import VehicleHistoryModal from '../modals/VehicleHistoryModal';
import CustomerReviewsModal from '../modals/CustomerReviewsModal';
import { parseTicketReview } from '../../utils/ticketReviews';
import { parseTicketNotes, formatPhoneNumber } from '../../utils/ticketNotesParser';
import { InternalStaffMember } from '../types/internal';

export const SAMPLE_QUEUE_TICKETS: InternalTicket[] = [];

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
}

export type OperationalView = 'ACTIVE' | 'SCHEDULED' | 'PENDING' | 'READY_RELEASE' | 'COMPLETED' | 'MISSED';

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
  onOpenHardcopyModal,
  pendingHardcopyCount = 0,
  onNavigateTab,
  staffList = [],
}: InternalQueueTabProps) {
  const [activeView, setActiveView] = useState<OperationalView>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals state
  const [historyVehicle, setHistoryVehicle] = useState<any | null>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

  // Soft Cancellation Void Modal State
  const [voidTarget, setVoidTarget] = useState<InternalTicket | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Assisted Reschedule State
  const [rescheduleTarget, setRescheduleTarget] = useState<InternalTicket | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(TIME_SLOTS[0]?.id || 'slot-1');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Mechanic Quick Assign Modal State
  const [assigningMechanicTicket, setAssigningMechanicTicket] = useState<InternalTicket | null>(null);
  const [selectedMechanicName, setSelectedMechanicName] = useState<string>('');
  const [isAssigningMechanic, setIsAssigningMechanic] = useState(false);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Available mechanics for workshop assignment
  const availableMechanics = useMemo(() => {
    const list = (staffList || []).filter((s) => s.isActive !== false);
    if (list.length > 0) return list;
    return [
      { id: 'mech-1', fullName: 'Kurt Andrei Alerta', position: 'Lead Technician', role: 'staff' as const, email: '', phone: '', isActive: true, createdAt: '' },
      { id: 'mech-2', fullName: 'Service Technician 1', position: 'Floor Mechanic', role: 'staff' as const, email: '', phone: '', isActive: true, createdAt: '' },
      { id: 'mech-3', fullName: 'Master Mechanic', position: 'Senior Technician', role: 'staff' as const, email: '', phone: '', isActive: true, createdAt: '' },
    ];
  }, [staffList]);

  // Helper to determine if a ticket is pending online confirmation
  const isPendingTicket = (t: { status: string; notes?: string | null }) => {
    return (
      t.status === 'PENDING_CONFIRMATION' ||
      Boolean(t.notes && t.notes.includes('[BOOKING:PENDING_CONFIRMATION]'))
    );
  };

  // Helper to determine if a ticket is a confirmed scheduled advance booking awaiting physical arrival
  const isScheduledBooking = (t: InternalTicket) => {
    if (t.is_walk_in) return false;
    if (isPendingTicket(t)) return false;
    if (
      t.status === 'COMPLETED' ||
      t.status === 'CANCELLED' ||
      t.status === 'CANCELLED_BY_ADMIN' ||
      t.status === 'MISSED' ||
      t.status === 'NO_SHOW'
    ) return false;
    if (t.stage > 4) return false;

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
  };

  // Helper to determine if a ticket is physically on the active shop floor
  const isActiveFloorTicket = (t: InternalTicket) => {
    if (isPendingTicket(t)) return false;
    if (isScheduledBooking(t)) return false;
    if (
      t.status === 'COMPLETED' ||
      t.status === 'CANCELLED' ||
      t.status === 'CANCELLED_BY_ADMIN' ||
      t.status === 'MISSED' ||
      t.status === 'NO_SHOW'
    ) return false;
    if (t.stage > 4) return false;
    return true;
  };

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

  // Bay Availability
  const bayAvailability = useMemo(() => {
    const occupiedBays = new Set<string>();
    tickets
      .filter(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'CANCELLED_BY_ADMIN' &&
          t.status !== 'MISSED' &&
          t.status !== 'NO_SHOW' &&
          t.assigned_bay
      )
      .forEach((t) => {
        if (t.assigned_bay) {
          occupiedBays.add(t.assigned_bay.toLowerCase().trim());
        }
      });
    const occupiedCount = occupiedBays.size;
    const availableCount = Math.max(0, 10 - occupiedCount);
    return {
      occupiedCount,
      availableCount,
      isFull: availableCount === 0,
    };
  }, [tickets]);

  // Customer Reviews statistics
  const reviewStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    tickets.forEach((t) => {
      const parsed = parseTicketReview(t.notes);
      if (parsed) {
        sum += parsed.rating;
        count++;
      }
    });
    return {
      count,
      avg: count > 0 ? (sum / count).toFixed(1) : '5.0',
    };
  }, [tickets]);

  // Live Counts for Operational Tabs
  // Live Counts for Operational Tabs
  const counts = useMemo(() => {
    const active = tickets.filter((t) => isActiveFloorTicket(t)).length;
    const scheduled = tickets.filter((t) => isScheduledBooking(t)).length;
    const pending = tickets.filter((t) => isPendingTicket(t)).length;

    const readyRelease = tickets.filter(
      (t) =>
        t.stage === 5 &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN' &&
        t.status !== 'MISSED' &&
        t.status !== 'NO_SHOW'
    ).length;

    const completed = tickets.filter((t) => t.status === 'COMPLETED').length;
    const missed = tickets.filter((t) => t.status === 'MISSED' || t.status === 'NO_SHOW' || t.status === 'CANCELLED' || t.status === 'CANCELLED_BY_ADMIN').length;

    const myAssigned = tickets.filter(
      (t) =>
        t.status !== 'COMPLETED' &&
        t.assigned_mechanic &&
        t.assigned_mechanic !== 'Queued for Assignment' &&
        t.assigned_mechanic.trim().toLowerCase() === currentStaffName.trim().toLowerCase()
    ).length;

    return { active, scheduled, pending, readyRelease, completed, missed, myAssigned };
  }, [tickets, currentStaffName, todayDateStr]);

  // Filtered & Sorted Tickets
  const filteredTickets = useMemo(() => {
    const filtered = tickets.filter((t) => {
      const isPending = isPendingTicket(t);
      const isScheduled = isScheduledBooking(t);
      const isActiveFloor = isActiveFloorTicket(t);
      const isCompleted = t.status === 'COMPLETED';
      const isMissedOrCancelled =
        t.status === 'MISSED' ||
        t.status === 'NO_SHOW' ||
        t.status === 'CANCELLED' ||
        t.status === 'CANCELLED_BY_ADMIN';

      if (activeView === 'ACTIVE') {
        if (!isActiveFloor) return false;
      } else if (activeView === 'SCHEDULED') {
        if (!isScheduled) return false;
      } else if (activeView === 'PENDING') {
        if (!isPending) return false;
      } else if (activeView === 'READY_RELEASE') {
        if (t.stage !== 5 || isCompleted || isMissedOrCancelled) return false;
      } else if (activeView === 'COMPLETED') {
        if (!isCompleted) return false;
      } else if (activeView === 'MISSED') {
        if (!isMissedOrCancelled) return false;
      }

      if (myTasksOnly) {
        if (
          !t.assigned_mechanic ||
          t.assigned_mechanic === 'Queued for Assignment' ||
          t.assigned_mechanic.trim().toLowerCase() !== currentStaffName.trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (t.ticket_code || '').toLowerCase();
        const customer = (t.customer_name || '').toLowerCase();
        const phone = (t.customer_phone || '').toLowerCase();
        const model = (t.motorcycles?.model || '').toLowerCase();
        const plate = (t.motorcycles?.plate_number || '').toLowerCase();
        const bay = (t.assigned_bay || '').toLowerCase();
        const mech = (t.assigned_mechanic || '').toLowerCase();
        const service = (t.service_type || '').toLowerCase();

        return (
          code.includes(q) ||
          customer.includes(q) ||
          phone.includes(q) ||
          model.includes(q) ||
          plate.includes(q) ||
          bay.includes(q) ||
          mech.includes(q) ||
          service.includes(q)
        );
      }

      return true;
    });

    // Priority sorting:
    // If viewing Scheduled Appointments, sort chronologically by dropoff_date ascending (closest first)
    // then by created_at ascending (first to book gets earlier spot)
    if (activeView === 'SCHEDULED') {
      return [...filtered].sort((a, b) => {
        const dateA = a.dropoff_date || '9999-99-99';
        const dateB = b.dropoff_date || '9999-99-99';
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        const timeA = new Date(a.created_at || '').getTime();
        const timeB = new Date(b.created_at || '').getTime();
        return timeA - timeB;
      });
    }

    return filtered;
  }, [tickets, activeView, myTasksOnly, searchQuery, currentStaffName, todayDateStr]);

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

      const { data, error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', assigningMechanicTicket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 20261016_fix_service_tickets_rls.sql.');
      }

      await recordAuditLog({
        ticketCode: assigningMechanicTicket.ticket_code,
        action: 'MECHANIC_ASSIGNED',
        actor: currentStaffName,
        details: mechName ? `Assigned technician: ${mechName}` : 'Cleared technician assignment.',
        previousValue: assigningMechanicTicket.assigned_mechanic || 'None',
        newValue: mechName || 'None',
      });

      broadcastTicketSync({ id: assigningMechanicTicket.id, ticket_code: assigningMechanicTicket.ticket_code, ...updates });
      setAssigningMechanicTicket(null);
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to assign mechanic:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to update technician assignment.'));
    } finally {
      setIsAssigningMechanic(false);
    }
  };

  // Check-in Motorcycle (Rider physically arrived at the shop floor)
  const handleCheckInMotorcycle = async (ticket: InternalTicket) => {
    setUpdatingId(ticket.id);
    try {
      const cleanedNotes = (ticket.notes || '').replace('[BOOKING:PENDING_DROPOFF]', '').trim();
      // Arrival marker so the missed-booking scan never expires a motorcycle that is already at the shop
      const checkInTag = `[CHECKED_IN: by ${currentStaffName} at ${new Date().toLocaleTimeString()}]`;
      const updates = {
        status: 'IN_PROGRESS',
        stage: 1,
        notes: cleanedNotes ? `${cleanedNotes} | ${checkInTag}` : checkInTag,
      };

      const { data, error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 20261016_fix_service_tickets_rls.sql.');
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
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to check in motorcycle.'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm Online Booking
  const handleConfirmBooking = async (ticket: InternalTicket) => {
    setUpdatingId(ticket.id);
    try {
      let cleanedNotes = (ticket.notes || '').replace('[BOOKING:PENDING_CONFIRMATION]', '').trim();
      
      const isAdvanceDate = Boolean(ticket.dropoff_date && ticket.dropoff_date > todayDateStr);
      if (isAdvanceDate && !cleanedNotes.includes('[BOOKING:PENDING_DROPOFF]')) {
        cleanedNotes = cleanedNotes ? `${cleanedNotes} [BOOKING:PENDING_DROPOFF]` : '[BOOKING:PENDING_DROPOFF]';
      }

      const updates = {
        status: 'IN_PROGRESS',
        stage: 1,
        notes: cleanedNotes,
      };

      const { data, error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 20261016_fix_service_tickets_rls.sql.');
      }

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'BOOKING_CONFIRMED',
        actor: currentStaffName,
        details: isAdvanceDate
          ? `Online booking accepted for scheduled drop-off date: ${ticket.dropoff_date}.`
          : 'Online booking accepted and placed into Stage 1 intake.',
        previousValue: ticket.status,
        newValue: 'IN_PROGRESS',
      });

      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to confirm booking:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to confirm booking.'));
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

      const { data, error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 20261016_fix_service_tickets_rls.sql.');
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
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to advance stage.'));
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
        alert(result.error || 'Failed to perform late check-in.');
      }
    } catch {
      alert('Network error while performing check-in.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Void / Cancel Confirmation
  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    const cleanReason = voidReason.trim();
    if (!cleanReason) {
      alert('Please specify a cancellation reason.');
      return;
    }

    setIsVoiding(true);
    try {
      const isPending = isPendingTicket(voidTarget);
      const cleanedNotes = (voidTarget.notes || '').replace('[BOOKING:PENDING_CONFIRMATION]', '').trim();
      const updates = {
        status: 'CANCELLED',
        cancellation_reason: cleanReason,
        cancelled_by: currentStaffName,
        cancelled_at: new Date().toISOString(),
        notes: cleanedNotes,
      };

      const { data, error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', voidTarget.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Database write permission error. Please run migration 20261016_fix_service_tickets_rls.sql.');
      }

      await recordAuditLog({
        ticketCode: voidTarget.ticket_code,
        action: isPending ? 'BOOKING_DECLINED' : 'TICKET_CANCELLED',
        actor: currentStaffName,
        details: isPending
          ? `Online booking declined. Reason: ${cleanReason}`
          : `Ticket cancelled and voided. Reason: ${cleanReason}`,
        previousValue: voidTarget.status,
        newValue: 'CANCELLED',
      });

      broadcastTicketSync({ id: voidTarget.id, ticket_code: voidTarget.ticket_code, ...updates });

      setVoidTarget(null);
      setVoidReason('');
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to void ticket:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to void ticket.'));
    } finally {
      setIsVoiding(false);
    }
  };

  // Assisted Reschedule
  const handleConfirmAssistedReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) {
      alert('Please select a new appointment date.');
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
      alert(result.error || 'Failed to reschedule ticket.');
    }
  };

  // Elapsed time helper
  const getElapsedText = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const now = Date.now();
    const diffMins = Math.max(1, Math.floor((now - created) / 60000));

    if (diffMins < 60) {
      return `${diffMins}m in shop`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''} in shop`;
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Header Row with Live Telemetry Pulse & Action Group */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Workshop Floor Queue
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Floor Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Active repair jobs, lift assignments, and shop floor stage tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Lifts Availability Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${bayAvailability.isFull ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>
              Lifts: <strong className="text-slate-900">{bayAvailability.availableCount} / 10 Free</strong>
            </span>
          </div>

          {/* Customer Reviews & Feedback Button */}
          <button
            type="button"
            onClick={() => setIsReviewsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="View verified customer reviews and feedback"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>Reviews ({reviewStats.avg} ★ • {reviewStats.count})</span>
          </button>

          {/* Pending Hardcopy Requests (if any) */}
          {typeof onOpenHardcopyModal === 'function' && pendingHardcopyCount > 0 && (
            <button
              type="button"
              onClick={onOpenHardcopyModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Stamp className="w-3.5 h-3.5 text-orange-600" />
              <span>Hardcopies ({pendingHardcopyCount})</span>
            </button>
          )}

          {/* New Walk-in Ticket Button */}
          <button
            type="button"
            onClick={() => setIsWalkInModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Walk-in Ticket</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Operational Command Bar (Clean, Consolidated Single Box) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs space-y-3">
        {/* Row 1: Workflow View Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
          {[
            { id: 'ACTIVE' as OperationalView, label: 'Active Floor Repairs', count: counts.active },
            { id: 'SCHEDULED' as OperationalView, label: 'Scheduled Appointments', count: counts.scheduled, alert: counts.scheduled > 0 },
            { id: 'PENDING' as OperationalView, label: 'Pending Online Bookings', count: counts.pending, alert: counts.pending > 0 },
            { id: 'READY_RELEASE' as OperationalView, label: 'Ready for Pickup', count: counts.readyRelease },
            { id: 'COMPLETED' as OperationalView, label: 'Released & History', count: counts.completed },
            { id: 'MISSED' as OperationalView, label: 'Cancelled / Missed', count: counts.missed },
          ].map((tab) => {
            const isSelected = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-xs shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Search, My Tasks & View Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, customer name, mobile, plate, bay, or technician..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            {/* My Assigned Tasks Toggle */}
            <button
              type="button"
              onClick={() => setMyTasksOnly(!myTasksOnly)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-xs flex items-center justify-center gap-1.5 border ${
                myTasksOnly
                  ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Assigned Jobs</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${myTasksOnly ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
                {counts.myAssigned}
              </span>
            </button>

            {/* Layout Toggle: Grid vs Compact Table */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewLayout === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewLayout === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ticket Cards / Table List View */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
            <MotorcycleIcon className="w-7 h-7 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900">No Tickets in this Category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no motorcycle repairs matching this operational view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsWalkInModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-2 text-xs font-bold transition active:scale-95 cursor-pointer mx-auto inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Ticket</span>
          </button>
        </div>
      ) : viewLayout === 'table' ? (
        /* ================= COMPACT TABLE VIEW ================= */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Motorcycle Unit</th>
                  <th className="py-3 px-4">Customer & Contact</th>
                  <th className="py-3 px-4">Appointment / Booking</th>
                  <th className="py-3 px-4">Bay / Lift</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Floor Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => {
                  const isPending = isPendingTicket(ticket);
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
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-orange-600">#{ticket.ticket_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {ticket.motorcycles?.model || 'Motorcycle Unit'}
                        </div>
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                          {ticket.motorcycles?.plate_number || 'NO PLATE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{customerName}</div>
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
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-orange-500" />
                              <span>{apptInfo.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Booked: {bookedDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Booked: {bookedDate}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {ticket.assigned_bay && ticket.assigned_bay !== 'Bay Assignment Pending' ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px]">
                            {ticket.assigned_bay}
                          </span>
                        ) : (
                          <span className="text-amber-600 text-[11px] font-semibold">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignMechanic(ticket)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 text-[11px] font-semibold transition cursor-pointer"
                            title="Click to change technician"
                          >
                            <UserCheck className="w-3 h-3 text-orange-600" />
                            <span>{ticket.assigned_mechanic}</span>
                            <Edit className="w-2.5 h-2.5 text-orange-400 ml-0.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignMechanic(ticket)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-700 border border-dashed border-slate-300 hover:border-orange-300 text-[11px] font-semibold transition cursor-pointer"
                            title="Click to assign technician"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>+ Assign</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isPending ? 'bg-amber-50 text-amber-900 border-amber-300' :
                          isScheduled ? 'bg-amber-50 text-amber-900 border-amber-300' :
                          isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          ticket.stage === 1 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          ticket.stage === 2 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          ticket.stage === 3 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                          ticket.stage === 4 ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isPending ? 'Pending' : isScheduled ? 'Scheduled' : `Stage ${ticket.stage}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmBooking(ticket)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Accept ➔
                          </button>
                        ) : isScheduled ? (
                          <button
                            type="button"
                            onClick={() => handleCheckInMotorcycle(ticket)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Check-in ➔
                          </button>
                        ) : ticket.stage === 1 ? (
                          <button
                            type="button"
                            onClick={() => onOpenDispatch(ticket)}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Assign Bay ➔
                          </button>
                        ) : ticket.stage >= 2 && ticket.stage < 4 ? (
                          <button
                            type="button"
                            onClick={() => handleQuickAdvanceStage(ticket, ticket.stage + 1)}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Stage {ticket.stage + 1} ➔
                          </button>
                        ) : ticket.stage === 4 ? (
                          <button
                            type="button"
                            onClick={() => onOpenStage5Billing(ticket)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Release ➔
                          </button>
                        ) : ticket.stage === 5 && !isCompleted ? (
                          <button
                            type="button"
                            onClick={() => onOpenStage5Billing(ticket)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Clearance ➔
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= CARD GRID VIEW ================= */
        <div className={`grid gap-4.5 ${filteredTickets.length === 1 ? 'grid-cols-1 max-w-3xl' : 'grid-cols-1 xl:grid-cols-2'}`}>
          {filteredTickets.map((ticket) => {
            const isPending = isPendingTicket(ticket);
            const isScheduled = isScheduledBooking(ticket);
            const isCompleted = ticket.status === 'COMPLETED';
            const isCancelled = ticket.status === 'CANCELLED' || ticket.status === 'CANCELLED_BY_ADMIN';
            const isMissed = ticket.status === 'MISSED' || ticket.status === 'NO_SHOW';
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

            const additionalAuthorizations = Array.isArray(ticket.billing_breakdown)
              ? ticket.billing_breakdown.filter((item) => item.isAdditional)
              : [];

            return (
              <div
                key={ticket.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs space-y-3.5 transition hover:shadow-sm"
              >
                {/* 1. Header Row: Ticket #, Model, Plate, Elapsed / Appt Date & Stage Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-black text-orange-600 text-sm">
                        #{ticket.ticket_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(ticket.ticket_code)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Copy ticket code"
                      >
                        {copiedCode === ticket.ticket_code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Plate Number Pill */}
                      <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {ticket.motorcycles?.plate_number || 'NO PLATE'}
                      </span>

                      {/* Appointment Date / Time Badge */}
                      {isScheduled && apptInfo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>{apptInfo.label}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {elapsed}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium">
                        • Booked: {bookedDate}
                      </span>

                      {ticket.is_walk_in && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          Walk-in
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-base text-slate-900 leading-snug truncate">
                      {ticket.motorcycles?.model || 'Motorcycle Unit'}
                    </h3>
                  </div>

                  {/* Single Clean Stage / Status Pill */}
                  <div className="shrink-0">
                    {isPending ? (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-300">
                        Pending Review
                      </span>
                    ) : isScheduled ? (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>Scheduled Drop-off</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                        Released & Paid
                      </span>
                    ) : isCancelled ? (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        Voided
                      </span>
                    ) : isMissed ? (
                      <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                        Missed Appointment
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        ticket.stage === 1 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        ticket.stage === 2 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        ticket.stage === 3 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                        ticket.stage === 4 ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        Stage {ticket.stage}: {
                          ticket.stage === 1 ? 'Intake Queue' :
                          ticket.stage === 2 ? 'Inspection' :
                          ticket.stage === 3 ? 'Active Repair' :
                          ticket.stage === 4 ? 'Quality Testing' : 'Ready for Pickup'
                        }
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Customer, Phone, Schedule & Service Package Details */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 flex-wrap gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customerName}</span>
                    </div>

                    {displayPhone && (
                      <a
                        href={`tel:${rawPhone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 transition font-mono font-semibold text-[11px]"
                        title="Click to dial customer"
                      >
                        <Phone className="w-3 h-3 text-orange-500" />
                        <span>{displayPhone}</span>
                      </a>
                    )}

                    {arrivalWindow && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{arrivalWindow}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-slate-500 text-xs">
                    Service: <strong className="text-slate-800">{ticket.service_type || 'General Service'}</strong>
                  </span>
                </div>

                {/* 3. Rider Reported Symptoms Callout (Cleaned, Sanitized, No Leakage) */}
                {symptoms && (
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-600 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      <Wrench className="w-3.5 h-3.5 text-orange-500" />
                      Rider Reported Complaint:
                    </span>
                    <p className="text-slate-800 italic leading-relaxed pl-4 text-xs font-medium">
                      "{symptoms}"
                    </p>
                  </div>
                )}

                {/* 4. Customer Review Callout (If reviewed) */}
                {review && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{review.rating}.0 Customer Review</span>
                      </div>
                      {review.comment && (
                        <p className="text-slate-700 italic text-xs truncate">"{review.comment}"</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReviewsModalOpen(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      View All Reviews →
                    </button>
                  </div>
                )}

                {/* 5. Additional Parts Authorization Status */}
                {additionalAuthorizations.length > 0 && (
                  <div className="space-y-1.5">
                    {additionalAuthorizations.map((auth) => (
                      <div
                        key={auth.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          auth.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : auth.approvalStatus === 'DECLINED'
                            ? 'bg-slate-100 border-slate-200 text-slate-600'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold block truncate">
                            {auth.name} — ₱{auth.unitPrice.toLocaleString()}
                          </span>
                          {auth.reason && (
                            <span className="text-[10px] text-slate-500 block truncate">
                              Finding: {auth.reason}
                            </span>
                          )}
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                          auth.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-200 text-emerald-900'
                            : auth.approvalStatus === 'DECLINED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {auth.approvalStatus === 'APPROVED' ? '✓ Customer Approved' : auth.approvalStatus === 'DECLINED' ? '✕ Declined' : 'Waiting on Rider'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Footer Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                  {/* Left: Bay, Mechanic & Secondary Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* Bay Lift Indicator */}
                    {ticket.assigned_bay && ticket.assigned_bay !== 'Bay Assignment Pending' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px]">
                        <Wrench className="w-3.5 h-3.5 text-orange-600" />
                        <span>{ticket.assigned_bay}</span>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Lift Unassigned</span>
                      </span>
                    )}

                    {/* Technician Assignment Pill with 1-Click Modal */}
                    {ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignMechanic(ticket)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 text-[11px] font-bold transition cursor-pointer"
                        title="Click to change assigned technician"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                        <span>Tech: <strong>{ticket.assigned_mechanic}</strong></span>
                        <Edit className="w-3 h-3 text-orange-500 ml-0.5 opacity-70" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignMechanic(ticket)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-700 border border-dashed border-slate-300 hover:border-orange-300 text-[11px] font-bold transition cursor-pointer"
                        title="Click to assign technician"
                      >
                        <Plus className="w-3 h-3 text-slate-400" />
                        <span>+ Assign Tech</span>
                      </button>
                    )}

                    {/* Chat button */}
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('messages')}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="Open customer chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    )}

                    {/* History button */}
                    {ticket.motorcycles?.plate_number && (
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryVehicle({
                            plate_number: ticket.motorcycles?.plate_number || 'NO PLATE',
                            model: ticket.motorcycles?.model || 'Motorcycle',
                            year_model: ticket.motorcycles?.year_model || '2024',
                            odometer: ticket.motorcycles?.odometer || '',
                            owner_name: customerName,
                            owner_phone: rawPhone || '',
                          })
                        }
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="View previous maintenance visits"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Primary Action Button */}
                  {isPending ? (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => setVoidTarget(ticket)}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleConfirmBooking(ticket)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Booking ➔</span>
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
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleCheckInMotorcycle(ticket)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                        title="Customer physically arrived with motorcycle at workshop"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{apptInfo?.isToday ? 'Check-in (Rider Arrived) ➔' : 'Early Check-in ➔'}</span>
                      </button>
                    </div>
                  ) : !isCompleted && !isCancelled && !isMissed ? (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Admin Void */}
                      {canVoidTicket(currentRole) && (
                        <button
                          type="button"
                          onClick={() => setVoidTarget(ticket)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Void / Cancel Ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Stage 1: Assign Bay */}
                      {ticket.stage === 1 && (
                        <button
                          type="button"
                          onClick={() => onOpenDispatch(ticket)}
                          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                        >
                          <Wrench className="w-4 h-4" />
                          <span>Assign Bay & Start ➔</span>
                        </button>
                      )}

                      {/* Stages 2 to 3: Advance Stage */}
                      {ticket.stage >= 2 && ticket.stage < 4 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickAdvanceStage(ticket, ticket.stage + 1)}
                          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          <span>Move to Stage {ticket.stage + 1} ➔</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {/* Stage 4: Mark Ready for Release */}
                      {ticket.stage === 4 && (
                        <button
                          type="button"
                          onClick={() => onOpenStage5Billing(ticket)}
                          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Mark Ready for Release ➔</span>
                        </button>
                      )}

                      {/* Stage 5: Release Unit */}
                      {ticket.stage === 5 && (
                        <button
                          type="button"
                          onClick={() => onOpenStage5Billing(ticket)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Process Release & Clearance ➔</span>
                        </button>
                      )}
                    </div>
                  ) : null}

                  {/* Completed Actions */}
                  {isCompleted && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {onOpenJobOrderPrint && (
                        <button
                          type="button"
                          onClick={() => onOpenJobOrderPrint(ticket)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Job Order</span>
                        </button>
                      )}
                      {onOpenReceiptPrint && (
                        <button
                          type="button"
                          onClick={() => onOpenReceiptPrint(ticket)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Missed Actions */}
                  {isMissed && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLateCheckIn(ticket)}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
                      >
                        Late Check-in
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescheduleTarget(ticket)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Customer Reviews & Feedback Modal */}
      <CustomerReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        tickets={tickets}
        currentStaffName={currentStaffName}
      />

      {/* Soft Cancellation / Void Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isPendingTicket(voidTarget) ? 'Decline Online Booking' : 'Cancel & Void Service Ticket'}
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition resize-none"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition"
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

      {/* Quick Assign Technician Modal */}
      {assigningMechanicTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Assign Service Technician
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

            {/* Quick Select from Active Workshop Staff */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Technician
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {availableMechanics.map((m) => {
                  const isSelected = selectedMechanicName.toLowerCase() === m.fullName.toLowerCase();
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMechanicName(m.fullName)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer text-xs ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/70 text-slate-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold">{m.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{m.position || 'Technician'}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-orange-600 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Technician Name Input */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-slate-600 block">
                Or type custom technician / assistant name
              </label>
              <input
                type="text"
                value={selectedMechanicName}
                onChange={(e) => setSelectedMechanicName(e.target.value)}
                placeholder="e.g. Kurt Andrei, Master Mechanic, Specialist..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedMechanicName('');
                }}
                disabled={isAssigningMechanic || !selectedMechanicName}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-40"
              >
                Clear Tech
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
                  type="button"
                  onClick={handleSaveMechanicAssignment}
                  disabled={isAssigningMechanic}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {isAssigningMechanic ? 'Saving...' : 'Save Technician'}
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
