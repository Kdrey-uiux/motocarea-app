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
  Wrench,
  AlertTriangle,
  Loader2,
  History,
  Clock,
  CheckCircle,
  Check,
  MessageSquareText,
} from 'lucide-react';
import VehicleHistoryModal from './VehicleHistoryModal';
import { toast } from '../utils/toast';
import { normalizeBayNumber } from '../utils/bays';

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

const BAYS = [
  { id: 'Bay 01', num: 1 },
  { id: 'Bay 02', num: 2 },
  { id: 'Bay 03', num: 3 },
  { id: 'Bay 04', num: 4 },
  { id: 'Bay 05', num: 5 },
  { id: 'Bay 06', num: 6 },
];

// Stage 1 (intake) is set by check-in; dispatch moves the unit through 2-5.
// Labels match what the customer sees (Inspect, Service, Test, Ready).
const STAGES = SERVICE_STAGES.filter((s) => s.step >= 2).map((s) => ({
  stage: s.step,
  label: s.name,
  desc: s.staffHint,
}));

const ETA_PRESETS = ['Today, 12:00 PM', 'Today, 4:00 PM', 'Tomorrow, 12:00 PM'];

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

const sectionLabel = 'text-xs font-bold text-slate-800';
const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition';

export default function DispatchTicketModal({
  ticket,
  isOpen,
  onClose,
  onSaved,
  allTickets,
  currentStaffName = 'Workshop Staff',
}: DispatchTicketModalProps) {
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
      // Keep the current bay, or suggest the first free one
      let initialBay = ticket.assigned_bay;
      if (!initialBay) {
        const maint = readSharedSetting<Record<string, boolean>>(SHARED_SETTINGS.bayMaintenance, {});
        const firstFreeBay = BAYS.find((b) => !bayOccupancyMap.has(b.num) && !maint[`bay-${b.num}`]);
        initialBay = firstFreeBay ? firstFreeBay.id : 'Bay 01';
      }
      setAssignedBay(initialBay);
      // Never pre-pick a mechanic silently; staff choose who works on the unit
      setAssignedMechanic(ticket.assigned_mechanic || '');
      // Dispatching a Stage 1 (checked-in) unit starts the inspection
      setStage(ticket.stage === 1 ? 2 : ticket.stage || 2);
      setStatus(ticket.status || 'IN_PROGRESS');
      setEstimatedPickup(ticket.estimated_pickup || '');
      setFindings(extractFindings(ticket.notes));
      setErrorMsg(null);
    }
  }, [isOpen, ticket, bayOccupancyMap]);

  const customerReport = useMemo(() => parseTicketNotes(ticket?.notes), [ticket]);

  if (!isOpen || !ticket) return null;

  const isMarkingReady = Number(stage) === 5;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Stage 5 only marks the unit READY_FOR_PICKUP; the actual handover/release happens
    // when the customer arrives (Queue → In the Shop → 5 · Ready → Process Release).
    setSaving(true);
    setErrorMsg(null);

    try {
      const updates = {
        assigned_bay: assignedBay,
        assigned_mechanic: assignedMechanic.trim() || null,
        stage: Number(stage),
        // Moving a ready unit back to Stage 2-4 puts it back in progress
        status: isMarkingReady ? 'READY_FOR_PICKUP' : status === 'READY_FOR_PICKUP' ? 'IN_PROGRESS' : status,
        estimated_pickup: estimatedPickup.trim() || null,
        notes: withFindings(ticket.notes, findings) || null,
      };

      const { data, error } = await db()
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          'Database rejected update due to PostgreSQL Row-Level Security. Please run migration 03_service_tickets.sql in Supabase SQL Editor.'
        );
      }
      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });

      if (ticket.stage !== Number(stage)) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'STAGE_CHANGE',
          actor: currentStaffName,
          details: `Stage updated to Stage ${stage}`,
          previousValue: `Stage ${ticket.stage}`,
          newValue: `Stage ${stage}`,
        });
      }

      if (ticket.assigned_bay !== assignedBay) {
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
        isMarkingReady
          ? `#${ticket.ticket_code} marked ready for pickup.`
          : `#${ticket.ticket_code} saved — ${assignedBay}, Stage ${stage}.`
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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-base text-slate-900">Update Job</h2>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                    #{ticket.ticket_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {ticket.motorcycles?.model || 'Motorcycle'} •{' '}
                  <span className="font-mono">{ticket.motorcycles?.plate_number || 'NO PLATE'}</span> •{' '}
                  {ticket.customer_name || 'Rider Customer'}
                  {ticket.motorcycles?.plate_number && (
                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline cursor-pointer ml-2"
                    >
                      <History className="w-3 h-3" /> History
                    </button>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
            <MessageSquareText className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold text-slate-700">Customer's report: </span>
              <span className="text-slate-600">{customerReport.symptoms || 'No symptoms reported.'}</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">Service: {ticket.service_type}</span>
            </div>
          </div>
        </div>

        {/* Body (scrolls) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* 1. Progress */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={sectionLabel}>Progress</span>
              <span className="text-[11px] text-slate-500">
                Now: Stage {ticket.stage}
                {stage !== ticket.stage && (
                  <>
                    {' '}→ <strong className="text-orange-600">Stage {stage}</strong>
                  </>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STAGES.map((s) => {
                const isSelected = stage === s.stage;
                const isDone = s.stage < stage;
                return (
                  <button
                    key={s.stage}
                    type="button"
                    onClick={() => setStage(s.stage)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/15'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex items-center gap-1.5 text-xs font-bold ${
                        isSelected ? 'text-orange-700' : isDone ? 'text-emerald-700' : 'text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : isDone
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3" /> : s.stage}
                      </span>
                      {s.label}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1 leading-snug">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Bay */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={sectionLabel}>Bay</span>
              <span className="text-[11px] text-slate-500">
                Selected: <strong className="text-orange-600">{assignedBay}</strong>
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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
                    title={
                      occupant
                        ? `In use by #${occupant.ticketCode} (${occupant.bikeModel})`
                        : inMaintenance
                        ? `${b.id} is under maintenance`
                        : `${b.id}: available`
                    }
                    className={`py-2 px-1 rounded-xl border text-center transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                        : occupant || inMaintenance
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-orange-300 cursor-pointer'
                    }`}
                  >
                    <span className="block text-sm font-black leading-none">{String(b.num).padStart(2, '0')}</span>
                    <span
                      className={`block text-[9px] mt-1 truncate ${
                        isSelected ? 'text-orange-100' : occupant ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {occupant ? `#${occupant.ticketCode}` : inMaintenance ? 'Maintenance' : 'Available'}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">Grey bays are in use by another motorcycle or under maintenance.</p>
          </section>

          {/* 3. Mechanic & ETA */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className={sectionLabel}>Mechanic</span>
              <MechanicPicker value={assignedMechanic} onChange={setAssignedMechanic} />
            </div>
            <div className="space-y-2">
              <span className={sectionLabel}>Estimated ready time</span>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={estimatedPickup}
                  onChange={(e) => setEstimatedPickup(e.target.value)}
                  placeholder="e.g. Today, 4:00 PM"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ETA_PRESETS.map((eta) => (
                  <button
                    key={eta}
                    type="button"
                    onClick={() => setEstimatedPickup(eta)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                      estimatedPickup === eta
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {eta}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 4. Mechanic findings (separate from the customer's notes) */}
          <section className="space-y-2">
            <span className={sectionLabel}>Mechanic findings</span>
            <textarea
              rows={2}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="e.g. Cleaned CVT, replaced drive belt, adjusted valve clearance"
              className={`${inputClass} resize-none`}
            />
          </section>
        </div>

        {/* Footer (always visible) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:block">
            {isMarkingReady ? 'Customer will see this as ready for pickup.' : `${assignedBay} • Stage ${stage}`}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold rounded-xl transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center gap-2 text-xs shadow-xs cursor-pointer ${
                isMarkingReady ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : isMarkingReady ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Mark Ready for Pickup
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
