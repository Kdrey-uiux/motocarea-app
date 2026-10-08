import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { recordAuditLog } from '../utils/auditLogger';
import { AdminTicket, UserRole } from '../types/admin';
import {
  adminLateCheckInOverride,
  adminExtendGracePeriod,
  adminAssistedReschedule,
  TIME_SLOTS
} from '../utils/bookingLifecycle';
import { 
  Search, 
  Filter, 
  Wrench, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Printer, 
  Settings, 
  Copy, 
  Check, 
  Phone, 
  Bike,
  Trash2,
  AlertCircle,
  CalendarSync
} from 'lucide-react';

interface AdminQueueTabProps {
  tickets: AdminTicket[];
  loading: boolean;
  onRefresh: () => void;
  onOpenDispatch: (ticket: AdminTicket) => void;
  onOpenPrint: (ticket: AdminTicket) => void;
  currentRole?: UserRole;
}

type FilterStatus = 'ALL' | 'STAGE_1' | 'STAGE_ACTIVE' | 'STAGE_5' | 'MISSED' | 'COMPLETED';

export default function AdminQueueTab({
  tickets,
  loading,
  onRefresh,
  onOpenDispatch,
  onOpenPrint,
  currentRole = 'admin',
}: AdminQueueTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Assisted Reschedule State
  const [rescheduleTarget, setRescheduleTarget] = useState<AdminTicket | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(TIME_SLOTS[0].id);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Copy helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 1-Click Stage Progression
  const handleQuickAdvanceStage = async (ticket: AdminTicket, nextStage: number) => {
    try {
      setUpdatingId(ticket.id);

      let nextStatus = ticket.status;
      if (nextStage === 5) {
        nextStatus = 'READY_FOR_PICKUP';
      }

      const updates: {
        stage: number;
        status?: string;
        updated_at: string;
      } = {
        stage: nextStage,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id);

      if (error) throw error;

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'STAGE_CHANGE',
        actor: 'Service Advisor (Admin Quick Action)',
        details: `Stage advanced from Stage ${ticket.stage} to Stage ${nextStage}`,
        previousValue: `Stage ${ticket.stage}`,
        newValue: `Stage ${nextStage}`,
      });

      onRefresh();
    } catch (err: unknown) {
      console.error('Error advancing stage:', err);
      alert('Failed to advance stage: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark Complete & Release
  const handleMarkComplete = async (ticket: AdminTicket) => {
    if (!confirm(`Mark Ticket #${ticket.ticket_code} as COMPLETED and released to customer?`)) return;
    try {
      setUpdatingId(ticket.id);

      const { error } = await supabase
        .from('service_tickets')
        .update({
          stage: 5,
          status: 'COMPLETED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (error) throw error;

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'TICKET_COMPLETED',
        actor: 'Service Advisor (Admin)',
        details: 'Unit released to customer and service marked as completed',
        previousValue: ticket.status,
        newValue: 'COMPLETED',
      });

      onRefresh();
    } catch (err: unknown) {
      console.error('Error completing ticket:', err);
      alert('Failed to mark ticket as complete.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete / Void Ticket (Staff and Admin Authorized with Audit Logging)
  const handleDeleteTicket = async (ticket: AdminTicket) => {
    const reason = prompt(
      `Sigurado ka bang nais mong I-VOID / I-CANCEL ang Ticket #${ticket.ticket_code}?\nIlagay ang dahilan ng pagkansela:`,
      'Customer requested cancellation on-site'
    );
    if (reason === null) return;
    const cleanReason = reason.trim() || 'No specific cancellation remarks';

    try {
      setUpdatingId(ticket.id);

      const { error } = await supabase
        .from('service_tickets')
        .delete()
        .eq('id', ticket.id);

      if (error) throw error;

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'TICKET_CANCELLED',
        actor: currentRole === 'staff' ? 'Workshop Staff' : 'Service Advisor (Admin)',
        details: `Ticket cancelled/voided. Dahilan: ${cleanReason}`,
        previousValue: ticket.status,
        newValue: 'CANCELLED_AND_VOIDED',
      });

      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to cancel ticket:', err);
      alert('Failed to void ticket: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtering
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const isMissed = t.status === 'MISSED' || t.status === 'NO_SHOW';

      // 1. Status Filter
      if (statusFilter === 'STAGE_1' && (t.stage !== 1 || t.status === 'COMPLETED' || isMissed)) return false;
      if (statusFilter === 'STAGE_ACTIVE' && (t.stage < 2 || t.stage > 4 || t.status === 'COMPLETED' || isMissed)) return false;
      if (statusFilter === 'STAGE_5' && (t.stage !== 5 || t.status === 'COMPLETED' || isMissed)) return false;
      if (statusFilter === 'MISSED' && !isMissed) return false;
      if (statusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const codeMatch = t.ticket_code?.toLowerCase().includes(query);
        const modelMatch = t.motorcycles?.model?.toLowerCase().includes(query);
        const plateMatch = t.motorcycles?.plate_number?.toLowerCase().includes(query);
        const nameMatch = t.profiles?.full_name?.toLowerCase().includes(query) || t.customer_name?.toLowerCase().includes(query);
        const serviceMatch = t.service_type?.toLowerCase().includes(query);

        return codeMatch || modelMatch || plateMatch || nameMatch || serviceMatch;
      }

      return true;
    });
  }, [tickets, statusFilter, searchQuery]);

  // Stage Badge Helper
  const getStageLabel = (stage: number, status: string) => {
    if (status === 'MISSED' || status === 'NO_SHOW') {
      return { text: 'Stage 1: Missed Drop-off (No-Show)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (status === 'COMPLETED') return { text: 'Stage 5: Completed & Released', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    switch (stage) {
      case 1:
        return { text: 'Stage 1: Intake & Check-in', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 2:
        return { text: 'Stage 2: Diagnosis & Tear-down', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 3:
        return { text: 'Stage 3: Bay Service & Parts', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 4:
        return { text: 'Stage 4: QA & Road Test', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 5:
        return { text: 'Stage 5: Ready for Release', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { text: `Stage ${stage}`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Plate Number, Ticket Code (e.g. MC-1234), Customer Name, or Package..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('STAGE_1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'STAGE_1'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Intake
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('STAGE_ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'STAGE_ACTIVE'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Service
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('STAGE_5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'STAGE_5'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ready
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('MISSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'MISSED'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-rose-700 hover:text-rose-900 bg-rose-50/80 border border-rose-200/70'
              }`}
            >
              Missed ({tickets.filter((t) => t.status === 'MISSED' || t.status === 'NO_SHOW').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'COMPLETED'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Ticket List Stream */}
      {loading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 text-xs shadow-xs">
          Loading workshop queue tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-xs">
          <Filter className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-800">No workshop tickets match criteria</div>
          <p className="text-xs text-slate-500">
            {searchQuery ? 'Subukan maghanap gamit ang ibang plate number o ticket code.' : 'Walang active ticket sa kasalukuyang filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((t) => {
            const stageInfo = getStageLabel(t.stage || 1, t.status);
            const isCompleted = t.status === 'COMPLETED';
            const isMissed = t.status === 'MISSED' || t.status === 'NO_SHOW';
            const isUpdating = updatingId === t.id;

            return (
              <div
                key={t.id}
                className={`bg-white border rounded-2xl p-5 transition-all shadow-xs ${
                  isMissed
                    ? 'border-rose-300 bg-rose-50/20 shadow-sm'
                    : t.status === 'READY_FOR_PICKUP'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Ticket Code Tag */}
                    <button
                      type="button"
                      onClick={() => handleCopyCode(t.ticket_code)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-blue-700 font-mono font-bold text-xs rounded-lg transition"
                      title="Click to copy ticket code"
                    >
                      <span>#{t.ticket_code}</span>
                      {copiedCode === t.ticket_code ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>

                    {/* Stage Badge */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${stageInfo.color}`}
                    >
                      {stageInfo.text}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                        isMissed
                          ? 'bg-rose-100 text-rose-800 border-rose-200 font-bold flex items-center gap-1'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isMissed && <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                      Status: {t.status}
                    </span>

                    {/* Dropoff Date */}
                    {t.dropoff_date && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Dropoff: {t.dropoff_date}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenPrint(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
                      title="Print Job Order"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print JO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDispatch(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Dispatch / Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleDeleteTicket(t)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition"
                      title="Void / Cancel Ticket (Staff & Admin Authorized)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Void</span>
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-slate-100 text-xs">
                  {/* Motorcycle Particulars */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1 flex items-center gap-1">
                      <Bike className="w-3 h-3 text-blue-600" /> Motorcycle Details
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {t.motorcycles?.model || 'Motorcycle Unit'}
                    </div>
                    <div className="font-mono text-blue-700 font-bold mt-0.5">
                      Plate: {t.motorcycles?.plate_number || 'No Plate'}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-blue-600" /> Customer / Rider
                    </span>
                    <div className="font-semibold text-slate-800">
                      {t.profiles?.full_name || t.customer_name || 'Rider Guest'}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {t.profiles?.phone_number || t.customer_phone || 'No phone recorded'}
                    </div>
                  </div>

                  {/* Service & Bay Assignment */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-purple-600" /> Package & Station
                    </span>
                    <div className="font-semibold text-slate-850 text-slate-800">{t.service_type}</div>
                    <div className="text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="text-blue-700 font-medium">{t.assigned_bay || 'Pending Bay'}</span>
                      <span>•</span>
                      <span>{t.assigned_mechanic || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Remarks & Total Estimate */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs">
                  <div className="text-slate-500 italic">
                    {t.notes ? (
                      <span className="not-italic">
                        <strong className="text-slate-700">Remarks:</strong> {t.notes}
                      </span>
                    ) : (
                      'No specific customer remarks provided.'
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Total Estimate
                    </span>
                    <span className="font-bold text-sm text-emerald-700">
                      {t.total_estimate || '₱500'}
                    </span>
                  </div>
                </div>

                {/* 1-Click Stage Progression Bar OR Missed Override Action Bar */}
                {isMissed ? (
                  <div className="mt-4 pt-3 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2.5 bg-rose-50/60 -mx-5 -mb-5 p-4 rounded-b-2xl">
                    <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Missed Drop-off Override & Rider Assistance:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={async () => {
                          if (confirm(`Accept late arrival check-in for Ticket #${t.ticket_code} and advance to Stage 2 (Diagnostic)?`)) {
                            setUpdatingId(t.id);
                            await adminLateCheckInOverride(t, currentRole === 'staff' ? 'Workshop Staff' : 'Service Advisor (Admin)');
                            setUpdatingId(null);
                            onRefresh();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        title="Customer arrived physically after window - override and check-in"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Late Check-in (Grace)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={async () => {
                          if (confirm(`Extend grace period by +1 hour for Ticket #${t.ticket_code}?`)) {
                            setUpdatingId(t.id);
                            await adminExtendGracePeriod(t, 1, currentRole === 'staff' ? 'Workshop Staff' : 'Service Advisor (Admin)');
                            setUpdatingId(null);
                            onRefresh();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        title="Customer called ahead delayed in traffic - extend grace window"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Extend Grace (+1h)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => {
                          setRescheduleTarget(t);
                          setRescheduleDate(t.dropoff_date || new Date().toISOString().split('T')[0]);
                          setRescheduleSlot(TIME_SLOTS[0].id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        title="Move to new date and time slot for calling customer"
                      >
                        <CalendarSync className="w-3.5 h-3.5" />
                        <span>Assist Reschedule</span>
                      </button>
                    </div>
                  </div>
                ) : !isCompleted && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>One-Click Stage Workflow:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {t.stage === 1 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickAdvanceStage(t, 2)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                        >
                          <span>Step 2: Begin Diagnosis & Teardown</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {t.stage === 2 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickAdvanceStage(t, 3)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                        >
                          <span>Step 3: Move to Bay Service & Parts</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {t.stage === 3 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickAdvanceStage(t, 4)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                        >
                          <span>Step 4: Quality Check & Road Test</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {t.stage === 4 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickAdvanceStage(t, 5)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                        >
                          <span>Step 5: Mark Ready for Release</span>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {t.stage === 5 && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleMarkComplete(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Release & Mark as Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assisted Reschedule Modal for Phone-in / Front Desk Riders */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarSync className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Assist Reschedule • #{rescheduleTarget.ticket_code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {rescheduleTarget.motorcycles?.model || 'Motorcycle'} ({rescheduleTarget.motorcycles?.plate_number || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Drop-off Date:
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Preferred Arrival Time Slot:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = rescheduleSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setRescheduleSlot(slot.id)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{slot.label}</div>
                          <div className="text-[11px] text-slate-500">{slot.id}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isRescheduling}
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRescheduling || !rescheduleDate}
                onClick={async () => {
                  if (!rescheduleTarget || !rescheduleDate) return;
                  setIsRescheduling(true);
                  const success = await adminAssistedReschedule(
                    rescheduleTarget,
                    rescheduleDate,
                    rescheduleSlot,
                    currentRole === 'staff' ? 'Workshop Staff' : 'Service Advisor (Admin)'
                  );
                  setIsRescheduling(false);
                  if (success) {
                    setRescheduleTarget(null);
                    onRefresh();
                  } else {
                    alert('Failed to reschedule ticket.');
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isRescheduling ? 'Saving...' : 'Save & Move Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
