import { X, Loader2, AlertTriangle, Calendar, Bike, Wrench } from 'lucide-react';
import { ServiceTicket } from '../../types/dashboard';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  ticket: ServiceTicket | null;
  loading?: boolean;
}

export default function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  ticket,
  loading = false,
}: CancelBookingModalProps) {
  if (!isOpen || !ticket) return null;

  const bikeModel = ticket.motorcycles?.model || 'Motorcycle Unit';
  const bikePlate = ticket.motorcycles?.plate_number || 'No Plate';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-[2rem] max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-rose-700">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Cancel Service Booking
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Ref #{ticket.ticket_code}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Booking Details Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-900">{bikeModel}</span>
            </div>
            <span className="font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
              {bikePlate}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Wrench className="w-3.5 h-3.5 text-orange-500" />
              <span>{ticket.service_type}</span>
            </div>
            {ticket.dropoff_date && (
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{ticket.dropoff_date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning text */}
        <div className="py-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to cancel this booking? Your reserved slot, arrival window, and workshop bay queue will be released immediately. Your vehicle will be available for new bookings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="py-2.5 px-5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            Keep Booking
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="py-2.5 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelling booking...</span>
              </>
            ) : (
              <span>Yes, Cancel Booking</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
