import { useState } from 'react';
import { createPortal } from 'react-dom';
import { InternalTicket } from '../types/internal';
import { cancelOrDeclineTicket, isPendingOnlineBooking } from '../utils/ticketActions';
import { Loader2 } from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';
import { toast } from '../utils/toast';

interface CancelTicketModalProps {
  ticket: InternalTicket;
  currentStaffName: string;
  onClose: () => void;
  /** The ticket was declined or cancelled */
  onDone: () => void;
}

/** Decline a booking request or cancel a ticket, with a reason (used by the Dashboard and the Queue) */
export default function CancelTicketModal({ ticket, currentStaffName, onClose, onDone }: CancelTicketModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const isRequest = isPendingOnlineBooking(ticket);

  const handleConfirm = async () => {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      toast.error(isRequest ? 'Please write why the booking is declined.' : 'Please write why the ticket is cancelled.');
      return;
    }
    setSaving(true);
    const result = await cancelOrDeclineTicket(ticket, cleanReason, currentStaffName);
    setSaving(false);
    if (!result.success) {
      toast.error('Error: ' + (result.error || 'Could not save this change.'));
      return;
    }
    toast.success(isRequest ? `#${ticket.ticket_code} declined.` : `#${ticket.ticket_code} cancelled.`);
    onDone();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <ScrollLock />
      <div className="bg-white rounded-[1.75rem] max-w-md w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">
            {isRequest ? 'Decline this booking?' : 'Cancel this ticket?'}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-mono">#{ticket.ticket_code}</span>
            {ticket.customer_name ? ` · ${ticket.customer_name}` : ''}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cancel-ticket-reason" className="text-sm font-semibold text-slate-800 block">
            Reason
          </label>
          <textarea
            id="cancel-ticket-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. No parts in stock, the rider called to cancel"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRequest ? 'Decline booking' : 'Cancel ticket'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
