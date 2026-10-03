import { FileText, CheckCircle2, X, Printer, MapPin, Clock, Stamp } from 'lucide-react';
import { HardcopyRequest } from '../utils/hardcopyService';

interface HardcopyAlertToastProps {
  request: HardcopyRequest | null;
  onDismiss: () => void;
  onOpenRequestsModal: () => void;
  onMarkReady: (req: HardcopyRequest) => void;
  onPrint: (req: HardcopyRequest) => void;
}

export default function HardcopyAlertToast({
  request,
  onDismiss,
  onOpenRequestsModal,
  onMarkReady,
  onPrint,
}: HardcopyAlertToastProps) {
  if (!request) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-amber-400 p-4 animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm animate-pulse">
            <Stamp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wide text-amber-800">
                Hardcopy Request Alert
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              REF #{request.id} • Just Now
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          title="Dismiss Toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        <div className="font-bold text-slate-900 text-sm">
          {request.customerName}
        </div>
        <div className="text-slate-600 font-medium">
          Motorcycle: <span className="font-bold text-slate-800">{request.bikeModel}</span> ({request.plateNumber})
        </div>
        <div className="text-[11px] text-slate-500">
          Purpose: <span className="text-slate-700 font-medium">{request.purpose}</span>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPrint(request)}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1 border border-blue-200 transition"
          title="Print official document"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Copy</span>
        </button>

        <button
          type="button"
          onClick={() => onMarkReady(request)}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition"
          title="Notify rider that copy is ready for pickup"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Mark Ready</span>
        </button>
      </div>

      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={onOpenRequestsModal}
          className="text-[10px] text-slate-400 hover:text-slate-700 underline font-medium"
        >
          View all hardcopy requests
        </button>
      </div>
    </div>
  );
}
