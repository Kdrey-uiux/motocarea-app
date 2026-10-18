import { InternalTicket } from '../types/internal';
import { 
  X, 
  Printer, 
  Wrench, 
  ShieldCheck, 
  ClipboardCheck, 
  CheckCircle2 
} from 'lucide-react';

interface OfficialReceiptPrintModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfficialReceiptPrintModal({
  ticket,
  isOpen,
  onClose,
}: OfficialReceiptPrintModalProps) {
  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = ticket.paid_at
    ? new Date(ticket.paid_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });


  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Modal Controls (Hidden when printed) */}
        <div className="print:hidden px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Vehicle Release Clearance & Gate Pass
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Gate Pass (Ctrl+P)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE GATE PASS CONTENT */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans bg-white text-slate-900 space-y-4 print:p-0 print:m-0 print:text-black">
          
          {/* Shop Header & Hub */}
          <div className="text-center border-b border-slate-200 pb-4 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Moto<span className="text-orange-500">Care</span> Workshop
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Santa Maria Hub • Bulacan, Philippines • Phone: +63 985 245 5897
            </p>
            <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] uppercase tracking-wider border border-emerald-200">
              Vehicle Release Clearance & Gate Pass
            </div>
          </div>

          {/* Ticket & Customer Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ticket Code</span>
              <span className="font-mono font-bold text-orange-600 text-sm">#{ticket.ticket_code}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Release Date & Time</span>
              <span className="font-medium text-slate-700">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
              <span className="font-bold text-slate-900">{ticket.customer_name || 'Rider Customer'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Motorcycle & Plate</span>
              <span className="font-bold text-slate-900">
                {ticket.motorcycles?.model || 'Motorcycle Unit'} ({ticket.motorcycles?.plate_number || 'N/A'})
              </span>
            </div>
          </div>

          {/* Completed Scope of Service */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-800">
              <span className="font-bold">Completed Service Scope:</span>
              <span className="font-bold text-orange-600">{ticket.service_type || 'Standard PMS'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Servicing Bay Lift:</span>
              <span className="font-medium">{ticket.assigned_bay || 'Workshop Bay'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Assigned Technician:</span>
              <span className="font-medium">{ticket.assigned_mechanic || 'Workshop Tech Team'}</span>
            </div>
          </div>

          {/* Release Clearance Stamp */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Clearance Status</span>
                <span className="font-bold text-emerald-900">VEHICLE INSPECTED & RELEASE APPROVED</span>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Releasing Officer</span>
              <span className="font-bold text-emerald-900">{ticket.released_by || 'Turnover Officer'}</span>
            </div>
          </div>

          {/* Service Warranty Terms */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[10px] text-slate-500 leading-relaxed space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              <span>MotoCare Service Workmanship Warranty Terms:</span>
            </div>
            <p>
              Workmanship warranty covers 7 calendar days from release date. All replaced OEM parts carry the standard manufacturer defect guarantee. Gate pass must be surrendered at the security gate upon departure.
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-10 border-b border-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold block mt-1">Releasing Officer Signature</span>
            </div>
            <div>
              <div className="h-10 border-b border-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold block mt-1">Customer / Vehicle Received By</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
