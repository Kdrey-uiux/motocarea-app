import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InternalTicket } from '../types/internal';
import { readSharedSetting, saveSharedSetting, SHARED_SETTINGS } from '../../lib/sharedSettings';
import { isAwaitingArrival, advanceTicketStage } from '../utils/ticketActions';
import { Wrench, Plus, X, ShieldAlert, ArrowRight, Clock, UserCheck, Power, Trash2, Loader2 } from '../../components/icons';
import { toast } from '../utils/toast';
import { normalizeBayNumber } from '../utils/bays';
import { SERVICE_STAGES } from '../../utils/serviceStages';
import { useNow } from '../hooks/useNow';
import { useBayCount, saveBayCount, bayLabel, MAX_BAYS, MIN_BAYS } from '../../utils/workshopBays';
import { recordAuditLog } from '../utils/databaseAuditLogger';

// Shared looks (same as the staff Dashboard and Queue)
const CARD = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';
const SECONDARY_BTN =
  'px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5';

interface InternalBaysTabProps {
  tickets: InternalTicket[];
  onOpenDispatch: (ticket: InternalTicket) => void;
  /** Release / mark-ready modal (stages 4 and 5) */
  onOpenStage5Billing?: (ticket: InternalTicket) => void;
  currentStaffName?: string;
  onRefresh?: () => void;
  /** The owner can add and remove bays */
  isOwner?: boolean;
}

// A motorcycle this long on a bay gets an amber time badge
const LONG_JOB_MINUTES = 180;

const ACTIVE_STATUSES_EXCLUDED = ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'];

/** A floor bay: id "bay-4", number "04", label "Bay 04" */
const makeBay = (num: number) => ({ id: `bay-${num}`, bayNumber: String(num).padStart(2, '0'), name: bayLabel(num) });

export default function InternalBaysTab({
  tickets,
  onOpenDispatch,
  onOpenStage5Billing,
  currentStaffName = 'Workshop Staff',
  onRefresh,
  isOwner = false,
}: InternalBaysTabProps) {
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // Next step for a motorcycle on a bay, same as the Queue buttons
  const runNextStep = async (ticket: InternalTicket) => {
    if (ticket.stage <= 1) {
      onOpenDispatch(ticket);
      return;
    }
    if (ticket.stage >= 4) {
      if (onOpenStage5Billing) onOpenStage5Billing(ticket);
      else onOpenDispatch(ticket);
      return;
    }
    setAdvancingId(ticket.id);
    const result = await advanceTicketStage(ticket, ticket.stage + 1, currentStaffName);
    setAdvancingId(null);
    if (!result.success) {
      toast.error('Error: ' + (result.error || 'Failed to advance stage.'));
      return;
    }
    onRefresh?.();
  };
  // Bays on the floor (set by the owner; updates live on every device)
  const bayCount = useBayCount();
  const [bayAction, setBayAction] = useState<'adding' | 'removing' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Bays beyond the count that still hold a motorcycle stay visible as "closing" until it leaves
  const floorBays = useMemo(() => {
    const closing = new Set<number>();
    for (const t of tickets) {
      if (ACTIVE_STATUSES_EXCLUDED.includes(t.status)) continue;
      const num = normalizeBayNumber(t.assigned_bay);
      if (num && num > bayCount && num <= MAX_BAYS) closing.add(num);
    }
    const nums = Array.from({ length: bayCount }, (_, i) => i + 1).concat([...closing].sort((a, b) => a - b));
    return nums.map(makeBay);
  }, [bayCount, tickets]);

  // Maintenance state per bay (shared across all devices via Supabase app_settings)
  const [maintenanceBays, setMaintenanceBays] = useState<Record<string, boolean>>(() =>
    readSharedSetting<Record<string, boolean>>(SHARED_SETTINGS.bayMaintenance, {})
  );

  useEffect(() => {
    const handleMaintenanceChange = () => {
      setMaintenanceBays(readSharedSetting<Record<string, boolean>>(SHARED_SETTINGS.bayMaintenance, {}));
    };
    window.addEventListener(SHARED_SETTINGS.bayMaintenance.event, handleMaintenanceChange);
    return () => window.removeEventListener(SHARED_SETTINGS.bayMaintenance.event, handleMaintenanceChange);
  }, []);

  const now = useNow();

  // Quick Dispatch Selection Modal State for vacant bay
  const [dispatchTargetBay, setDispatchTargetBay] = useState<string | null>(null);

  const toggleMaintenance = (bayId: string) => {
    // A bay with a motorcycle on it must be cleared first, or the unit would disappear from view
    const bayNum = parseInt(floorBays.find((b) => b.id === bayId)?.bayNumber || '', 10);
    const occupant = !maintenanceBays[bayId]
      ? tickets.find(
          (t) =>
            !['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'].includes(t.status) &&
            normalizeBayNumber(t.assigned_bay) === bayNum
        )
      : undefined;
    if (occupant) {
      toast.error(`#${occupant.ticket_code} is still on this bay. Move it to another bay before maintenance.`);
      return;
    }
    const updated = { ...maintenanceBays, [bayId]: !maintenanceBays[bayId] };
    setMaintenanceBays(updated);
    saveSharedSetting(SHARED_SETTINGS.bayMaintenance, updated).then((res) => {
      if (!res.success) {
        toast.error('Error: ' + (res.error || 'Failed to save bay maintenance status.'));
      }
    });
  };

  // Map tickets to the floor bays using exact integer normalization
  const baysData = useMemo(() => {
    return floorBays.map((staticBay) => {
      const isUnderMaintenance = !!maintenanceBays[staticBay.id];
      const bayNumInt = parseInt(staticBay.bayNumber, 10);

      const matchingTicket = tickets.find(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'CANCELLED_BY_ADMIN' &&
          t.status !== 'MISSED' &&
          t.status !== 'NO_SHOW' &&
          t.assigned_bay &&
          normalizeBayNumber(t.assigned_bay) === bayNumInt
      );

      if (isUnderMaintenance) {
        return {
          ...staticBay,
          status: 'MAINTENANCE' as const,
          activeTicket: undefined,
        };
      }

      if (matchingTicket) {
        return {
          ...staticBay,
          status: 'OCCUPIED' as const,
          activeTicket: matchingTicket,
        };
      }

      return {
        ...staticBay,
        status: 'AVAILABLE' as const,
        activeTicket: undefined,
      };
    });
  }, [tickets, maintenanceBays, floorBays]);


  // Checked-in Stage 1 units waiting for a bay (bookings not yet at the shop are excluded)
  const queueTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.stage === 1 &&
        t.status === 'IN_PROGRESS' &&
        !isAwaitingArrival(t)
    );
  }, [tickets]);

  // The last bay can be removed only while it is free
  const lastBay = baysData[bayCount - 1];
  const canRemoveLast = bayCount > MIN_BAYS && floorBays.length === bayCount && lastBay?.status !== 'OCCUPIED';

  const changeBayCount = async (next: number) => {
    const adding = next > bayCount;
    setBayAction(adding ? 'adding' : 'removing');
    const result = await saveBayCount(next, currentStaffName);
    setBayAction(null);
    setConfirmRemove(false);
    if (!result.success) {
      toast.error(result.error || 'Could not change the number of bays.');
      return;
    }
    toast.success(
      adding
        ? `${bayLabel(next)} added. Riders can now book ${next} a day.`
        : `${bayLabel(bayCount)} removed. Riders can now book ${next} a day.`
    );
    recordAuditLog({
      ticketCode: 'WORKSHOP',
      action: adding ? 'BAY_ADDED' : 'BAY_REMOVED',
      actor: currentStaffName,
      details: adding ? `Added ${bayLabel(next)} (now ${next} bays)` : `Removed ${bayLabel(bayCount)} (now ${next} bays)`,
      previousValue: String(bayCount),
      newValue: String(next),
    });
  };

  // Closing bays still count as "in use" but not toward the shop's bays
  const openBays = baysData.slice(0, bayCount);
  const vacantLiftsCount = openBays.filter((b) => b.status === 'AVAILABLE').length;
  const occupiedLiftsCount = baysData.filter((b) => b.status === 'OCCUPIED').length;
  const maintenanceLiftsCount = openBays.filter((b) => b.status === 'MAINTENANCE').length;
  const workingBays = Math.max(1, bayCount - maintenanceLiftsCount + (baysData.length - bayCount));
  const usePct = Math.min(100, Math.round((occupiedLiftsCount / workingBays) * 100));

  const minutesIn = (createdAt: string) => Math.max(1, Math.floor((now - new Date(createdAt).getTime()) / 60000));
  const formatMinutes = (mins: number) =>
    mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ''}`.trim();

  return (
    <div className="space-y-4">
      {/* 1. Slim summary: how full the floor is */}
      <div className={`${CARD} px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6`}>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="font-display text-3xl font-bold text-slate-900 tabular-nums">{occupiedLiftsCount}</span>
          <span className="text-sm text-slate-500">of {workingBays} bays in use</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${usePct}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            {occupiedLiftsCount} in use
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {vacantLiftsCount} free
          </span>
          {maintenanceLiftsCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              {maintenanceLiftsCount} maintenance
            </span>
          )}
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => changeBayCount(bayCount + 1)}
            disabled={bayAction !== null || bayCount >= MAX_BAYS}
            className="shrink-0 self-start sm:self-auto px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title={bayCount >= MAX_BAYS ? `The workshop can have up to ${MAX_BAYS} bays` : 'Add another service bay'}
          >
            {bayAction === 'adding' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add bay
          </button>
        )}
      </div>

      {/* 2. Waiting for a bay (only when there are some) */}
      {queueTickets.length > 0 && (
        <section className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/70 bg-white card-elevated px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-10 h-10 rounded-[12px] bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
                {queueTickets.length} waiting for a bay
              </h2>
              <p className="text-xs text-slate-500">
                {vacantLiftsCount > 0 ? 'Checked in. Put them on a free bay.' : 'No free bay right now.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:ml-auto lg:justify-end">
            {queueTickets.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 bg-white border border-slate-200/70 rounded-full pl-4 pr-1.5 py-1.5 card-elevated min-w-0 max-w-full"
              >
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.motorcycles?.model || 'Motorcycle'}</p>
                  <p className="text-xs text-slate-500 truncate">
                    <span className="font-mono">{t.motorcycles?.plate_number}</span> · waiting {formatMinutes(minutesIn(t.created_at))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDispatch(t)}
                  disabled={vacantLiftsCount === 0}
                  className="px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Assign bay
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Floor plan: the bays as equal slots, like the real shop floor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
        {baysData.map((bay) => {
          const ticket = bay.status === 'OCCUPIED' ? bay.activeTicket : undefined;
          const isMaintenance = bay.status === 'MAINTENANCE';

          /* ---- Bay with a motorcycle ---- */
          if (ticket) {
            const mechanic =
              ticket.assigned_mechanic && ticket.assigned_mechanic !== 'Queued for Assignment' ? ticket.assigned_mechanic : null;
            const mins = minutesIn(ticket.created_at);
            const isLong = mins >= LONG_JOB_MINUTES;
            const nextLabel =
              ticket.stage <= 1
                ? 'Start'
                : ticket.stage < 4
                ? `To ${SERVICE_STAGES[ticket.stage]?.name ?? 'next stage'}`
                : ticket.stage === 4
                ? 'Mark ready'
                : 'Release';

            return (
              <div key={bay.id} className={`${CARD} relative overflow-hidden p-5 flex flex-col min-h-[16rem]`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="w-8 h-8 rounded-xl bg-orange-500 text-white font-display font-bold flex items-center justify-center shadow-md shadow-orange-500/25">
                      {bay.bayNumber}
                    </span>
                    Bay {bay.bayNumber}
                    {parseInt(bay.bayNumber, 10) > bayCount && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium" title="This bay was removed; it closes when this motorcycle leaves">
                        Closing
                      </span>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isLong ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}
                    title={isLong ? 'On the bay for more than 3 hours' : 'Time in the shop'}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {formatMinutes(mins)}
                  </span>
                </div>

                <div className="mt-4 min-w-0">
                  <p className="font-display text-lg font-bold tracking-tight text-slate-900 leading-snug truncate" title={ticket.motorcycles?.model}>
                    {ticket.motorcycles?.model || 'Motorcycle'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    <span className="font-mono">{ticket.motorcycles?.plate_number || 'No plate'}</span> · {ticket.service_type}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-5 gap-1" aria-label={`Stage ${ticket.stage} of 5`}>
                  {SERVICE_STAGES.map((st) => (
                    <div key={st.step} className="min-w-0">
                      <div
                        className={`h-1.5 rounded-full ${
                          st.step < ticket.stage ? 'bg-orange-300' : st.step === ticket.stage ? 'bg-orange-500' : 'bg-slate-200'
                        }`}
                      />
                      <span
                        className={`block text-[10px] mt-1 truncate ${
                          st.step === ticket.stage ? 'text-slate-900 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {st.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0 text-sm text-slate-600">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        mechanic ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {mechanic ? mechanic.charAt(0).toUpperCase() : <UserCheck className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate">{mechanic || 'No mechanic'}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenDispatch(ticket)}
                      className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Manage
                    </button>
                    <button
                      type="button"
                      onClick={() => runNextStep(ticket)}
                      disabled={advancingId === ticket.id}
                      className="px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
                    >
                      {nextLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          /* ---- Bay under maintenance: striped, out of use ---- */
          if (isMaintenance) {
            return (
              <div
                key={bay.id}
                className="relative rounded-2xl sm:rounded-[1.75rem] border border-slate-200 p-5 flex flex-col min-h-[16rem] bg-[repeating-linear-gradient(135deg,#f1f5f9_0,#f1f5f9_12px,#e9eef4_12px,#e9eef4_24px)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Bay {bay.bayNumber}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-slate-600 text-xs font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Maintenance
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-display text-7xl font-bold text-slate-300/90 leading-none">{bay.bayNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMaintenance(bay.id)}
                  className="self-center px-4 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  Back online
                </button>
              </div>
            );
          }

          /* ---- Free bay: an empty spot on the floor ---- */
          const isLastBay = bay.id === lastBay?.id;
          return (
            <div
              key={bay.id}
              className="group relative rounded-2xl sm:rounded-[1.75rem] bg-white/50 border-2 border-dashed border-slate-300/80 hover:border-orange-300 hover:bg-white min-h-[16rem] transition hover:shadow-[0_10px_28px_-12px_rgba(15,23,42,0.15)]"
            >
              <div className="h-full p-[1.125rem] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">Bay {bay.bayNumber}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Free
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-display text-7xl font-bold text-slate-300 group-hover:text-orange-200 leading-none transition">
                    {bay.bayNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleMaintenance(bay.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                      title="Set to maintenance"
                      aria-label={`Set Bay ${bay.bayNumber} to maintenance`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {isOwner && isLastBay && canRemoveLast && (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(true)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove this bay"
                        aria-label={`Remove Bay ${bay.bayNumber}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDispatchTargetBay(`Bay ${bay.bayNumber}`)}
                    className="px-4 py-1.5 rounded-full bg-white border border-slate-200 group-hover:border-orange-300 text-slate-700 group-hover:text-orange-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Owner: confirm removing the last bay */}
      {confirmRemove &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[1.75rem] max-w-sm w-full shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
              <span className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-slate-900">Remove {bayLabel(bayCount)}?</h3>
              <p className="mt-1 text-sm text-slate-500">
                The workshop will have {bayCount - 1} {bayCount - 1 === 1 ? 'bay' : 'bays'}, and riders can book up to{' '}
                {bayCount - 1} a day. Bookings already made stay as they are.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => changeBayCount(bayCount - 1)}
                  disabled={bayAction !== null}
                  className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {bayAction === 'removing' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Remove bay
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Pick a waiting motorcycle for a free bay */}
      {dispatchTargetBay &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[1.75rem] max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Assign to {dispatchTargetBay}</h3>
                  <p className="text-sm text-slate-500">Pick a motorcycle waiting at intake.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchTargetBay(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto p-3">
                {queueTickets.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Wrench className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">No motorcycles waiting for a bay.</p>
                    <p className="text-xs text-slate-400">Check one in or create a walk-in from the Queue first.</p>
                  </div>
                ) : (
                  queueTickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setDispatchTargetBay(null);
                        onOpenDispatch({ ...t, assigned_bay: dispatchTargetBay });
                      }}
                      className="w-full text-left px-3 py-3 rounded-2xl hover:bg-orange-50 flex items-center justify-between gap-3 transition cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {t.motorcycles?.model || 'Motorcycle'}
                          <span className="ml-2 font-mono text-xs text-slate-500">{t.motorcycles?.plate_number}</span>
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {t.ticket_code} · {t.customer_name || 'Walk-in'} · {t.service_type}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>

              <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex justify-end">
                <button type="button" onClick={() => setDispatchTargetBay(null)} className={SECONDARY_BTN}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
