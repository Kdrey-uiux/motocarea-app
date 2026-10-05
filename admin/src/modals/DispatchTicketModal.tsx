import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { recordAuditLog } from '../utils/auditLogger';
import { getTechnicianStaffList } from '../utils/staffManager';
import { AdminTicket } from '../types/admin';
import { 
  X, 
  Wrench, 
  UserCheck, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Loader2,
  AlertTriangle 
} from 'lucide-react';

interface DispatchTicketModalProps {
  ticket: AdminTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const BAYS = [
  { id: 'Bay 01', label: 'Bay 01 - Quick Lube & Express Inspection (Lift A)' },
  { id: 'Bay 02', label: 'Bay 02 - CVT Cleaning & Transmission Lab (Lift B)' },
  { id: 'Bay 03', label: 'Bay 03 - Engine Overhaul & Heavy Repair (Lift C)' },
  { id: 'Bay 04', label: 'Bay 04 - Final Safety QA & Electrical Station (Bay D)' },
];

const STAGES = [
  { stage: 1, label: 'Stage 1: Intake & Check-in' },
  { stage: 2, label: 'Stage 2: Diagnosis & Tear-down' },
  { stage: 3, label: 'Stage 3: Active Service & Parts Replacement' },
  { stage: 4, label: 'Stage 4: Quality Inspection & Road Test' },
  { stage: 5, label: 'Stage 5: Ready for Customer Release' },
];

export default function DispatchTicketModal({
  ticket,
  isOpen,
  onClose,
  onSaved,
}: DispatchTicketModalProps) {
  const [assignedBay, setAssignedBay] = useState('');
  const [assignedMechanic, setAssignedMechanic] = useState('');
  const [stage, setStage] = useState<number>(1);
  const [status, setStatus] = useState<string>('IN_PROGRESS');
  const [estimatedPickup, setEstimatedPickup] = useState('');
  const [totalEstimate, setTotalEstimate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live mechanics list from Staff Roster
  const availableMechanics = useMemo(() => {
    const list = getTechnicianStaffList();
    const result: Array<{ name: string; role: string }> = list.map((s) => ({
      name: s.name,
      role: s.position,
    }));
    // If ticket has assigned mechanic not in list, keep it as option
    if (ticket?.assigned_mechanic && !result.some((m) => m.name === ticket.assigned_mechanic)) {
      result.unshift({ name: ticket.assigned_mechanic, role: 'Assigned Tech' });
    }
    return result;
  }, [ticket]);

  useEffect(() => {
    if (ticket) {
      setAssignedBay(ticket.assigned_bay || 'Bay 01');
      setAssignedMechanic(ticket.assigned_mechanic || availableMechanics[0]?.name || 'Kuya Jun');
      setStage(ticket.stage || 1);
      setStatus(ticket.status || 'IN_PROGRESS');
      setEstimatedPickup(ticket.estimated_pickup || 'Today, 4:00 PM');
      setTotalEstimate(ticket.total_estimate || '₱500');
      setNotes(ticket.notes || '');
      setErrorMsg(null);
    }
  }, [ticket, availableMechanics]);

  if (!isOpen || !ticket) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      let nextStatus = status;
      if (stage === 5 && status === 'IN_PROGRESS') {
        nextStatus = 'READY_FOR_PICKUP';
      }

      const updates = {
        assigned_bay: assignedBay,
        assigned_mechanic: assignedMechanic,
        stage: Number(stage),
        status: nextStatus,
        estimated_pickup: estimatedPickup,
        total_estimate: totalEstimate,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id);

      if (error) throw error;

      // Broadcast real-time update to all open tabs and devices (customer tracker, dashboard, admin queue)
      if (typeof window !== 'undefined') {
        try {
          supabase.channel('motocare_dispatch_realtime').send({
            type: 'broadcast',
            event: 'TICKET_DISPATCH_SYNC',
            payload: { id: ticket.id, ticket_code: ticket.ticket_code, ...updates },
          });
          window.dispatchEvent(
            new CustomEvent('motocare_ticket_dispatched', {
              detail: { id: ticket.id, ...updates },
            })
          );
        } catch {
          // ignore
        }
      }

      // Mag-record ng Audit Logs para sa mga nabago
      if (ticket.stage !== Number(stage)) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'STAGE_CHANGE',
          actor: 'Service Advisor (Admin)',
          details: `Service progression moved to Stage ${stage}`,
          previousValue: `Stage ${ticket.stage}`,
          newValue: `Stage ${stage}`,
        });
      }

      if (ticket.assigned_bay !== assignedBay) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'BAY_ASSIGNMENT',
          actor: 'Service Advisor (Admin)',
          details: `Unit relocated to ${assignedBay}`,
          previousValue: ticket.assigned_bay || 'Unassigned',
          newValue: assignedBay,
        });
      }

      if (ticket.assigned_mechanic !== assignedMechanic) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'MECHANIC_ASSIGNMENT',
          actor: 'Service Advisor (Admin)',
          details: `Reassigned mechanic in-charge to ${assignedMechanic}`,
          previousValue: ticket.assigned_mechanic || 'Unassigned',
          newValue: assignedMechanic,
        });
      }

      if (ticket.status !== nextStatus) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'STATUS_CHANGE',
          actor: 'Service Advisor (Admin)',
          details: `Ticket lifecycle status changed to ${nextStatus}`,
          previousValue: ticket.status,
          newValue: nextStatus,
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update ticket dispatch:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Workshop Dispatch Console</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 font-bold border border-orange-200">
                  #{ticket.ticket_code}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {ticket.motorcycles?.model || 'Motorcycle'} • {ticket.motorcycles?.plate_number || 'Plate N/A'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[78vh]">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Context Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rider Customer</span>
              <span className="font-semibold text-slate-800">
                {ticket.profiles?.full_name || ticket.customer_name || 'Guest Rider'}
              </span>
              <span className="text-slate-500 text-[11px] block">
                {ticket.profiles?.phone_number || ticket.customer_phone || 'No phone'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Requested Package</span>
              <span className="font-bold text-orange-600">{ticket.service_type}</span>
            </div>
          </div>

          {/* Bay Assignment */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Wrench className="w-3.5 h-3.5 text-orange-500" />
              Workshop Bay Assignment
            </label>
            <select
              value={assignedBay}
              onChange={(e) => setAssignedBay(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 transition"
            >
              {BAYS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mechanic Assignment */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Assigned Lead Mechanic / Technician
            </label>
            <select
              value={assignedMechanic}
              onChange={(e) => setAssignedMechanic(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 transition"
            >
              {availableMechanics.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          </div>

          {/* Service Stage */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-orange-500" />
              Current Workflow Stage
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STAGES.map((s) => (
                <button
                  type="button"
                  key={s.stage}
                  onClick={() => setStage(s.stage)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                    stage === s.stage
                      ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{s.label}</span>
                  {stage === s.stage && <span className="w-2 h-2 rounded-full bg-orange-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Status & Estimated Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                Ticket Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 transition"
              >
                <option value="IN_PROGRESS">IN_PROGRESS (Under Service)</option>
                <option value="READY_FOR_PICKUP">READY_FOR_PICKUP (Completed QA)</option>
                <option value="COMPLETED">COMPLETED (Released & Paid)</option>
                <option value="CANCELLED">CANCELLED (Void / Cancel)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Total Estimate (₱)
              </label>
              <input
                type="text"
                value={totalEstimate}
                onChange={(e) => setTotalEstimate(e.target.value)}
                placeholder="₱500 - ₱850"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          {/* Estimated Pickup */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              Estimated Pickup Time / Release Date
            </label>
            <input
              type="text"
              value={estimatedPickup}
              onChange={(e) => setEstimatedPickup(e.target.value)}
              placeholder="e.g. Today, 4:30 PM"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 transition"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['+45 Mins', '+1.5 Hours', 'Today 4:00 PM', 'Today 6:00 PM', 'Tomorrow 10:00 AM'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setEstimatedPickup(preset)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded-md transition font-medium border border-slate-200"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Technician & Diagnostic Remarks */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Technician Findings & Job Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail observations (e.g. Front brake pads worn down to 15%, belt deglazed, oil changed to 10W-40 full synthetic)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/20 active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save & Dispatch Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
