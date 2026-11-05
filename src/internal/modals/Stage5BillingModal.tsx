import { useState } from 'react';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { InternalTicket } from '../types/internal';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { X, CheckCircle2, Printer, AlertTriangle, Loader2 } from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

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
  const allChecked = checkTasksDone && checkKeysReady && checkWalkaround;
  const checklist = [
    { label: 'The work is finished and checked', checked: checkTasksDone, set: setCheckTasksDone },
    { label: 'Keys and belongings are with the rider', checked: checkKeysReady, set: setCheckKeysReady },
    { label: 'The rider looked over the motorcycle', checked: checkWalkaround, set: setCheckWalkaround },
  ];

  const handleConfirmHandoverAndRelease = async () => {
    if (!checkTasksDone || !checkKeysReady || !checkWalkaround) {
      setErrorMsg('Please tick all 3 items before releasing.');
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <div className="bg-white rounded-[1.75rem] max-w-md w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {releaseSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4 my-auto">
            <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </span>
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-slate-900">Motorcycle released</h3>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-mono">#{releaseSuccess.ticket_code}</span> went home with{' '}
                {releaseSuccess.customer_name || 'the rider'}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="order-2 sm:order-1 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenReceiptPrint(releaseSuccess);
                  onClose();
                }}
                className="order-1 sm:order-2 px-4 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print gate pass
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                  {isAlreadyCompleted ? 'Already released' : 'Release this motorcycle'}
                </h2>
                <p className="text-sm text-slate-500 break-words">
                  {ticket.motorcycles?.model || 'Motorcycle'}
                  <span className="font-mono"> · {ticket.motorcycles?.plate_number || 'No plate'}</span>
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

            <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4">
              {errorMsg && (
                <p className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </p>
              )}

              {/* Who and what */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-xs text-slate-400">Rider</dt>
                  <dd className="font-medium text-slate-900 break-words">{ticket.customer_name || 'Customer'}</dd>
                  {ticket.customer_phone && (
                    <dd>
                      <a href={`tel:${ticket.customer_phone}`} className="font-mono text-xs text-slate-500 hover:text-orange-600 transition">
                        {ticket.customer_phone}
                      </a>
                    </dd>
                  )}
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-slate-400">Bay and mechanic</dt>
                  <dd className="font-medium text-slate-900 break-words">
                    {ticket.assigned_bay || 'No bay'}
                    {ticket.assigned_mechanic ? ` · ${ticket.assigned_mechanic}` : ''}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0">
                  <dt className="text-xs text-slate-400">Service</dt>
                  <dd className="font-medium text-slate-900 break-words">{ticket.service_type || 'General service'}</dd>
                </div>
              </dl>

              {!isAlreadyCompleted && (
                <>
                  <fieldset className="space-y-1">
                    <legend className="text-sm font-semibold text-slate-800 mb-1.5">Before releasing</legend>
                    {checklist.map((item) => (
                      <label
                        key={item.label}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-sm text-slate-800 transition cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => {
                            item.set(e.target.checked);
                            setErrorMsg(null);
                          }}
                          className="w-[18px] h-[18px] shrink-0 accent-orange-500 cursor-pointer"
                        />
                        {item.label}
                      </label>
                    ))}
                  </fieldset>

                  <div className="space-y-1.5">
                    <label htmlFor="release-note" className="text-sm font-semibold text-slate-800 block">
                      Note <span className="font-medium text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="release-note"
                      type="text"
                      placeholder="e.g. Spare key returned"
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpenReceiptPrint(ticket)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                Gate pass
              </button>
              {isAlreadyCompleted ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || !allChecked}
                  onClick={handleConfirmHandoverAndRelease}
                  className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? 'Releasing…' : 'Release'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
