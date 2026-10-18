import { useState } from 'react';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { InternalTicket } from '../types/internal';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { 
  X, 
  KeyRound, 
  CheckCircle2, 
  Printer, 
  Bike, 
  User, 
  Phone, 
  Wrench, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';

interface Stage5BillingModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentConfirmed: (ticket: InternalTicket) => void;
  onOpenReceiptPrint: (ticket: InternalTicket) => void;
  currentStaffName?: string;
}

export default function Stage5BillingModal({
  ticket,
  isOpen,
  onClose,
  onPaymentConfirmed,
  onOpenReceiptPrint,
  currentStaffName = 'Workshop Staff',
}: Stage5BillingModalProps) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [releaseSuccess, setReleaseSuccess] = useState<InternalTicket | null>(null);
  
  // Handover Checklist State (staff tick each item at the counter)
  const [checkTasksDone, setCheckTasksDone] = useState(false);
  const [checkKeysReady, setCheckKeysReady] = useState(false);
  const [checkWalkaround, setCheckWalkaround] = useState(false);

  // Fresh form for every ticket opened (reset during render when the modal opens)
  const openKey = isOpen ? ticket?.id ?? 'open' : '';
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setReleaseSuccess(null);
      setErrorMsg(null);
      setHandoverNotes('');
      setCheckTasksDone(false);
      setCheckKeysReady(false);
      setCheckWalkaround(false);
    }
  }

  if (!isOpen || !ticket) return null;

  const isAlreadyCompleted = ticket.status === 'COMPLETED';

  const handleConfirmHandoverAndRelease = async () => {
    if (!checkTasksDone || !checkKeysReady || !checkWalkaround) {
      setErrorMsg('Please confirm all 3 handover verification checklist items before release.');
      return;
    }

    if (['CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'].includes(ticket.status)) {
      setErrorMsg('This ticket is cancelled or missed and cannot be released.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const updates = {
        stage: 5,
        status: 'COMPLETED',
        released_by: currentStaffName,
        paid_at: new Date().toISOString(),
        notes: handoverNotes ? `${ticket.notes ? `${ticket.notes}\n` : ''}[Turnover]: ${handoverNotes}` : ticket.notes,
      };

      const { data: releasedRows, error } = await db()
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id');

      if (error) throw error;
      if (!releasedRows || releasedRows.length === 0) {
        throw new Error('The release was not saved (no permission to update this ticket). Please sign in again.');
      }

      // Realtime cross-device broadcast
      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });

      await recordAuditLog({
        ticketCode: ticket.ticket_code,
        action: 'VEHICLE_RELEASED',
        actor: currentStaffName,
        details: `Vehicle keys handed over and unit cleared for release by ${currentStaffName}.`,
        previousValue: `Stage ${ticket.stage} (${ticket.status})`,
        newValue: 'COMPLETED (RELEASED)',
      });

      const updatedTicket: InternalTicket = {
        ...ticket,
        ...updates,
      };

      onPaymentConfirmed(updatedTicket);
      setReleaseSuccess(updatedTicket);
    } catch (err: unknown) {
      console.error('Failed to confirm vehicle release:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to release motorcycle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        {releaseSuccess ? (
          <div className="p-8 text-center space-y-5 animate-in fade-in zoom-in-95 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">Motorcycle Officially Released!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ticket <span className="font-mono font-bold text-slate-700">#{releaseSuccess.ticket_code}</span> has been marked completed and turned over to <span className="font-semibold text-slate-800">{releaseSuccess.customer_name || 'Rider Customer'}</span>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  onOpenReceiptPrint(releaseSuccess);
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Pass / Job Clearance</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center font-bold shadow-2xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-orange-600 text-sm">
                  #{ticket.ticket_code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isAlreadyCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-purple-50 text-purple-800 border border-purple-200'
                }`}>
                  {isAlreadyCompleted ? 'Released & Cleared' : 'Stage 5: Ready for Handover'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Vehicle Turnover & Gate Pass Clearance
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* Motorcycle & Customer Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {ticket.motorcycles?.model || 'Motorcycle Unit'}
                  </h3>
                  <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] inline-block mt-0.5">
                    {ticket.motorcycles?.plate_number || 'NO PLATE'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Scope</span>
                <span className="font-bold text-slate-900 block">{ticket.service_type || 'Standard PMS'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-slate-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{ticket.customer_name || 'Customer'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{ticket.customer_phone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  Station: <strong>{ticket.assigned_bay || 'Workshop Bay'}</strong>
                  {ticket.assigned_mechanic && ` • Tech: ${ticket.assigned_mechanic}`}
                </span>
              </div>
            </div>
          </div>

          {/* Release Sign-off Checklist */}
          <div className="border border-slate-200/90 rounded-2xl p-4 space-y-2.5 bg-white">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Turnover Sign-Off Checklist</span>
            </span>

            <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer">
              <input
                type="checkbox"
                checked={checkTasksDone}
                disabled={isAlreadyCompleted}
                onChange={(e) => setCheckTasksDone(e.target.checked)}
                className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  Work order service tasks inspected & verified
                </span>
                <span className="text-[11px] text-slate-400 block">
                  All labor checklist items and test runs completed by assigned mechanic.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer">
              <input
                type="checkbox"
                checked={checkKeysReady}
                disabled={isAlreadyCompleted}
                onChange={(e) => setCheckKeysReady(e.target.checked)}
                className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  Motorcycle keys & personal belongings accounted for
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Original keys retrieved from rack and handed over directly to the owner.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer">
              <input
                type="checkbox"
                checked={checkWalkaround}
                disabled={isAlreadyCompleted}
                onChange={(e) => setCheckWalkaround(e.target.checked)}
                className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  Customer walk-around inspection complete
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Customer inspected the motorcycle condition at the counter and cleared vehicle release.
                </span>
              </div>
            </label>
          </div>

          {/* Releasing Staff & Handover Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Releasing Staff: <strong className="text-slate-800">{currentStaffName}</strong></span>
              <span>Turnover Desk Clearance</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 text-xs block mb-1">
                Handover Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                disabled={isAlreadyCompleted}
                placeholder="e.g. Test ride cleared by rider, duplicate key returned..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={() => onOpenReceiptPrint(ticket)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Gate Pass</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
            >
              {isAlreadyCompleted ? 'Close' : 'Cancel'}
            </button>

            {!isAlreadyCompleted && (
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmHandoverAndRelease}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Releasing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Release & Handover Keys ➔</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </>
    )}
  </div>
</div>
  );
}
