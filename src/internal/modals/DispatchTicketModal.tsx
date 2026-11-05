import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../lib/supabase';
import { SERVICE_STAGES } from '../../utils/serviceStages';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { InternalTicket, InternalStaffMember } from '../types/internal';
import { readSharedSetting, SHARED_SETTINGS } from '../../lib/sharedSettings';
import { parseTicketNotes } from '../../utils/ticketNotesParser';
import MechanicPicker from '../components/MechanicPicker';
import {
  X,
  AlertTriangle,
  Loader2,
  History,
  CheckCircle,
  Check,
} from '../../components/icons';
import VehicleHistoryModal from './VehicleHistoryModal';
import { toast } from '../utils/toast';
import { normalizeBayNumber } from '../utils/bays';
import { useBayCount, bayList } from '../../utils/workshopBays';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

interface DispatchTicketModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  allTickets: InternalTicket[];
  staffList: InternalStaffMember[];
  onOpenStage5Billing?: (ticket: InternalTicket) => void;
  currentStaffName?: string;
}


// Stage 1 (intake) is set by check-in; dispatch moves the unit through 2-5.
// Labels match what the customer sees (Inspect, Service, Test, Ready).
const STAGES = SERVICE_STAGES.filter((s) => s.step >= 2).map((s) => ({
  stage: s.step,
  label: s.name,
}));

// What the rider sees until the shop sets a time
const NO_READY_TIME = ['To be assessed upon arrival', 'Evaluating unit...'];

/**
 * Times to pick from for "Ready by": what is left of today, then the next open day (closed Sundays).
 * Saves a real date ("Nov 6, 4:00 PM"), because a saved "Today" would be wrong by tomorrow.
 */
function readyByOptions(now: Date): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const addDay = (day: Date, dayLabel: string) => {
    for (const hour of [12, 16]) {
      const at = new Date(day);
      at.setHours(hour, 0, 0, 0);
      if (at <= now) continue;
      options.push({
        label: `${dayLabel}, ${hour === 12 ? '12 PM' : '4 PM'}`,
        value: at.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      });
    }
  };

  if (now.getDay() !== 0) addDay(now, 'Today');
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  const isTomorrow = next.getDay() !== 0;
  if (!isTomorrow) next.setDate(next.getDate() + 1);
  addDay(next, isTomorrow ? 'Tomorrow' : next.toLocaleDateString('en-US', { weekday: 'short' }));
  return options;
}

// Mechanic findings live in their own " | Mechanic Findings: ..." segment so editing
// them never touches the customer's details or the booking tags stored in notes.
const FINDINGS_SEGMENT = /\s*\|?\s*Mechanic Findings:[^|\n]*/;

function extractFindings(notes?: string | null): string {
  const match = (notes || '').match(/Mechanic Findings:\s*([^|\n]*)/);
  return match ? match[1].trim() : '';
}

function withFindings(notes: string | null | undefined, findings: string): string {
  const base = (notes || '').replace(FINDINGS_SEGMENT, '').trim();
  const clean = findings.replace(/[|\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return base;
  return base ? `${base} | Mechanic Findings: ${clean}` : `Mechanic Findings: ${clean}`;
}

const sectionLabel = 'text-sm font-semibold text-slate-800';
const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition';

export default function DispatchTicketModal({
  ticket,
  isOpen,
  onClose,
  onSaved,
  allTickets,
  currentStaffName = 'Workshop Staff',
}: DispatchTicketModalProps) {
  // Bays set by the owner (updates live)
  const bayCount = useBayCount();
  const BAYS = useMemo(() => bayList(bayCount), [bayCount]);
  const [assignedBay, setAssignedBay] = useState('Bay 01');
  const [assignedMechanic, setAssignedMechanic] = useState('');
  const [stage, setStage] = useState<number>(2);
  const [status, setStatus] = useState<string>('IN_PROGRESS');
  const [estimatedPickup, setEstimatedPickup] = useState('');
  const [findings, setFindings] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Live occupancy for each bay to prevent double-booking
  const bayOccupancyMap = useMemo(() => {
    const map = new Map<number, { ticketCode: string; bikeModel: string; plate: string }>();
    allTickets
      .filter(
        (t) =>
          t.id !== ticket?.id &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'CANCELLED_BY_ADMIN' &&
          t.status !== 'MISSED' &&
          t.status !== 'NO_SHOW' &&
          t.assigned_bay
      )
      .forEach((t) => {
        const bayNum = normalizeBayNumber(t.assigned_bay);
        if (bayNum) {
          map.set(bayNum, {
            ticketCode: t.ticket_code,
            bikeModel: t.motorcycles?.model || 'Motorcycle',
            plate: t.motorcycles?.plate_number || 'NO PLATE',
          });
        }
      });
    return map;
  }, [allTickets, ticket]);

  // Bays switched to maintenance on the Bays page can't take a motorcycle
  const maintenanceBays = isOpen
    ? readSharedSetting<Record<string, boolean>>(SHARED_SETTINGS.bayMaintenance, {})
    : {};
  const isUnderMaintenance = (bayNum: number) => Boolean(maintenanceBays[`bay-${bayNum}`]);

  // Load the form once per opened ticket. Live ticket refreshes (realtime) must not
  // reset what staff are typing, so later bay-occupancy changes are ignored here.
  const loadedTicketId = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !ticket) {
      loadedTicketId.current = null;
      return;
    }
    if (loadedTicketId.current === ticket.id) return;
    loadedTicketId.current = ticket.id;
    {
      // Keep the current bay, or suggest the first free one (none selected when all are taken)
      let initialBay = ticket.assigned_bay;
      if (!initialBay) {
        const maint = readSharedSetting<Record<string, boolean>>(SHARED_SETTINGS.bayMaintenance, {});
        const firstFreeBay = BAYS.find((b) => !bayOccupancyMap.has(b.num) && !maint[`bay-${b.num}`]);
        initialBay = firstFreeBay ? firstFreeBay.id : '';
      }
      setAssignedBay(initialBay);
      // Never pre-pick a mechanic silently; staff choose who works on the unit
      setAssignedMechanic(ticket.assigned_mechanic || '');
      // Dispatching a Stage 1 (checked-in) unit starts the inspection
      setStage(ticket.stage === 1 ? 2 : ticket.stage || 2);
      setStatus(ticket.status || 'IN_PROGRESS');
      const savedReadyTime = ticket.estimated_pickup || '';
      setEstimatedPickup(NO_READY_TIME.includes(savedReadyTime) ? '' : savedReadyTime);
      setFindings(extractFindings(ticket.notes));
      setErrorMsg(null);
    }
  }, [isOpen, ticket, bayOccupancyMap, BAYS]);

  const customerReport = useMemo(() => parseTicketNotes(ticket?.notes), [ticket]);

  if (!isOpen || !ticket) return null;

  // A motorcycle at intake only needs a bay and a mechanic. Everything else comes later.
  const isAssignMode = ticket.stage <= 1;
  const isMarkingReady = !isAssignMode && Number(stage) === 5;
  const hasFreeBay = BAYS.some((b) => !bayOccupancyMap.has(b.num) && !isUnderMaintenance(b.num));
  const readyOptions = readyByOptions(new Date());
  // A time saved earlier stays visible even when it is no longer one of the choices
  const savedReadyOption =
    estimatedPickup && !readyOptions.some((o) => o.value === estimatedPickup) ? estimatedPickup : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignedBay) {
      setErrorMsg('Please pick a bay.');
      return;
    }

    // Stage 5 only marks the unit READY_FOR_PICKUP; the actual handover/release happens
    // when the customer arrives (Queue → In the Shop → 5 · Ready → Process Release).
    setSaving(true);
    setErrorMsg(null);

    try {
      // Latest notes, so a check-in or tag saved after this form opened is never overwritten
      const latestNotes = allTickets.find((t) => t.id === ticket.id)?.notes ?? ticket.notes;
      const updates = isAssignMode
        ? {
            assigned_bay: assignedBay,
            assigned_mechanic: assignedMechanic.trim() || null,
            stage: 2,
            status: 'IN_PROGRESS',
          }
        : {
            assigned_bay: assignedBay,
            assigned_mechanic: assignedMechanic.trim() || null,
            stage: Number(stage),
            // Moving a ready unit back to Stage 2-4 puts it back in progress
            status: isMarkingReady ? 'READY_FOR_PICKUP' : status === 'READY_FOR_PICKUP' ? 'IN_PROGRESS' : status,
            estimated_pickup: estimatedPickup.trim() || null,
            notes: withFindings(latestNotes, findings) || null,
          };

      const { data, error } = await db()
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "This ticket could not be saved. It may have just changed, or your account can't edit it. Refresh and try again."
        );
      }
      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });

      if (!isAssignMode && ticket.stage !== Number(stage)) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'STAGE_CHANGE',
          actor: currentStaffName,
          details: `Stage updated to Stage ${stage}`,
          previousValue: `Stage ${ticket.stage}`,
          newValue: `Stage ${stage}`,
        });
      }

      if (isAssignMode || ticket.assigned_bay !== assignedBay) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'BAY_ASSIGNMENT',
          actor: currentStaffName,
          details: `Motorcycle dispatched to ${assignedBay}${assignedMechanic ? ` (${assignedMechanic})` : ''}`,
          previousValue: ticket.assigned_bay || 'Unassigned',
          newValue: assignedBay,
        });
      }

      toast.success(
        isAssignMode
          ? `#${ticket.ticket_code} is now on ${assignedBay}.`
          : isMarkingReady
          ? `#${ticket.ticket_code} marked ready for pickup.`
          : `#${ticket.ticket_code} saved: ${assignedBay}, Stage ${stage}.`
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to dispatch ticket:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to dispatch ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <form
        onSubmit={handleSave}
        className={`bg-white text-slate-800 w-full max-w-xl rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]`}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                {isAssignMode ? 'Assign a bay' : 'Update job'}
              </h2>
              <p className="text-sm text-slate-500 break-words">
                {ticket.motorcycles?.model || 'Motorcycle'}
                <span className="font-mono"> · {ticket.motorcycles?.plate_number || 'No plate'}</span> ·{' '}
                {ticket.customer_name || 'Rider Customer'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 text-sm space-y-0.5">
            <p className="text-slate-800 break-words">
              <span className="text-slate-500">Service: </span>
              {ticket.service_type}
            </p>
            {customerReport.symptoms && (
              <p className="text-slate-800 break-words">
                <span className="text-slate-500">Rider&apos;s concern: </span>
                {customerReport.symptoms}
              </p>
            )}
            {ticket.motorcycles?.plate_number && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" /> Previous visits
              </button>
            )}
          </div>
        </div>

        {/* Body (scrolls) */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Stage: for corrections. The Queue's next button handles the normal steps. */}
          {!isAssignMode && (
            <section className="space-y-1.5">
              <span className={sectionLabel}>Stage</span>
              <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Stage">
                {STAGES.map((s) => {
                  const isSelected = stage === s.stage;
                  const isDone = s.stage < stage;
                  return (
                    <button
                      key={s.stage}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setStage(s.stage)}
                      className={`h-10 px-0.5 rounded-full border text-xs sm:text-sm transition cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500 text-white font-semibold'
                          : isDone
                          ? 'border-orange-200 bg-orange-50 text-orange-700 font-medium'
                          : 'border-slate-200 bg-white text-slate-700 font-medium hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {isMarkingReady && <p className="text-xs text-slate-500">The rider will see this as ready for pickup.</p>}
            </section>
          )}

          {/* Bay and mechanic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="space-y-1.5 min-w-0">
              <span className={sectionLabel}>Bay</span>
              {isAssignMode && !hasFreeBay && (
                <p className="px-3.5 py-2.5 rounded-2xl bg-amber-50 text-amber-800 text-sm">
                  All bays are taken. Close this for now. The motorcycle stays in the Queue, waiting for a bay.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {BAYS.map((b) => {
                  const occupant = bayOccupancyMap.get(b.num);
                  const inMaintenance = isUnderMaintenance(b.num);
                  const isSelected = assignedBay === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={Boolean(occupant) || (inMaintenance && !isSelected)}
                      onClick={() => setAssignedBay(b.id)}
                      aria-pressed={isSelected}
                      aria-label={`${b.id}: ${occupant ? 'taken' : inMaintenance ? 'under maintenance' : 'free'}`}
                      title={
                        occupant
                          ? `Taken by #${occupant.ticketCode} (${occupant.bikeModel})`
                          : inMaintenance
                          ? `${b.id} is under maintenance`
                          : `${b.id} is free`
                      }
                      className={`flex-1 min-w-[3.25rem] max-w-[6rem] h-11 rounded-2xl border leading-none transition ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : occupant || inMaintenance
                          ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-orange-300 cursor-pointer'
                      }`}
                    >
                      <span className="block font-display text-sm font-bold">{String(b.num).padStart(2, '0')}</span>
                      <span className={`block text-[10px] mt-0.5 ${isSelected ? 'text-orange-100' : ''}`}>
                        {occupant ? 'Taken' : inMaintenance ? 'Closed' : isSelected ? 'Selected' : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-1.5 min-w-0">
              <span className={sectionLabel}>
                Mechanic {isAssignMode && <span className="font-medium text-slate-400">(optional)</span>}
              </span>
              <MechanicPicker value={assignedMechanic} onChange={setAssignedMechanic} />
            </section>
          </div>

          {!isAssignMode && (
            <>
              {/* Shown to the rider on the tracking page */}
              <section className="space-y-1.5">
                <span className={sectionLabel}>
                  Ready by <span className="font-medium text-slate-400">(the rider sees this)</span>
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ready by">
                  {[
                    { label: 'Not sure yet', value: '' },
                    ...(savedReadyOption ? [{ label: savedReadyOption, value: savedReadyOption }] : []),
                    ...readyOptions,
                  ].map((option) => {
                    const isSelected = estimatedPickup === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setEstimatedPickup(option.value)}
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Mechanic findings (separate from the customer's notes) */}
              <section className="space-y-1.5">
                <label htmlFor="job-findings" className={`${sectionLabel} block`}>
                  Findings
                </label>
                <textarea
                  id="job-findings"
                  rows={2}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="e.g. Replaced drive belt, adjusted valve clearance"
                  className={`${inputClass} resize-none`}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer (always visible) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !assignedBay}
              className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : isAssignMode ? (
                <>
                  <Check className="w-4 h-4" /> Start work
                </>
              ) : isMarkingReady ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Mark ready
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save
                </>
              )}
            </button>
          </div>
        </div>

      </form>

      {ticket.motorcycles && (
        <VehicleHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          tickets={allTickets}
          vehicle={{
            plate_number: ticket.motorcycles.plate_number || 'N/A',
            model: ticket.motorcycles.model || 'Motorcycle',
            year_model: ticket.motorcycles.year_model,
            odometer: ticket.motorcycles.odometer,
            owner_name: ticket.customer_name,
            owner_phone: ticket.customer_phone,
          }}
        />
      )}
    </div>
  );
}
