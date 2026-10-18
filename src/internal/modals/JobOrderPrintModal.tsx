import { InternalTicket } from '../types/internal';
import { 
  X, 
  Printer, 
  Wrench, 
  FileText, 
  Bike, 
  Calendar, 
  User, 
  Gauge 
} from 'lucide-react';

interface JobOrderPrintModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function JobOrderPrintModal({
  ticket,
  isOpen,
  onClose,
}: JobOrderPrintModalProps) {
  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = (ticket.created_at ? new Date(ticket.created_at) : new Date()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bikeModel = ticket.motorcycles?.model || 'Motorcycle Unit';
  const plateNumber = ticket.motorcycles?.plate_number || 'NO PLATE';
  const odometerReading = ticket.odometer || ticket.motorcycles?.odometer || 'N/A';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Controls - Hidden in Print */}
        <div className="print:hidden px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Intake Job Order Slip (Handlebar Tag)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Job Slip (Ctrl+P)</span>
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

        {/* PRINTABLE JOB SLIP CONTENT */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans bg-white text-slate-900 space-y-4 print:p-0 print:m-0 print:text-black">
          
          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-3 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Moto<span className="text-orange-500">Care</span> Workshop
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Santa Maria Hub, Bulacan • Workshop Floor Handlebar Tag
            </p>
            <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-900 text-white font-black text-xs tracking-widest uppercase">
              WORKSHOP JOB ORDER SLIP
            </div>
          </div>

          {/* Ticket Header & Barcode Simulator */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Job Order Code
            </span>
            <div className="text-3xl font-black font-mono tracking-wider text-slate-900">
              #{ticket.ticket_code}
            </div>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Intake Date: {formattedDate}</span>
            </p>
          </div>

          {/* Motorcycle & Customer Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Unit</span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-orange-500 shrink-0" />
                <span>{bikeModel}</span>
              </div>
              <div className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block text-[11px]">
                {plateNumber}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer / Rider</span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="truncate">{ticket.customer_name || 'Rider Customer'}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {ticket.customer_phone || 'N/A'}
              </p>
            </div>
          </div>

          {/* Floor Assignment */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Bay</span>
              <span className="font-bold text-slate-900 text-xs">
                {ticket.assigned_bay || 'Unassigned / Floor Queue'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Lead Technician</span>
              <span className="font-bold text-slate-900 text-xs">
                {ticket.assigned_mechanic || 'Unassigned Technician'}
              </span>
            </div>
          </div>

          {/* Odometer & Requested Services */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span>Odometer Mileage:</span>
              </span>
              <span className="font-mono font-bold text-slate-900">{odometerReading}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Requested Package / Service
              </span>
              <div className="p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-900">
                {ticket.service_type || 'General Maintenance & Diagnostics'}
              </div>
            </div>
          </div>

          {/* Complaints / Floor Notes */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Customer Complaint / Inspection Notes
            </span>
            <p className="text-slate-800 italic leading-relaxed">
              {ticket.notes || 'Standard check-up requested. No abnormal engine complaints logged.'}
            </p>
          </div>

          {/* Mechanic Checklist Checkboxes */}
          <div className="border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Floor Inspection Checklist (Technician Sign-off)
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 font-medium">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span>Engine Oil Drain & Filter Clean</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span>CVT Belt & Pulley Free-play</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span>Brake Fluid & Pad Wear</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span>Tire Pressure & Alignment</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span>Battery Voltage (12.4V+ min)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300" />
                <span>Final Road Test & Throttle QA</span>
              </label>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-3 border-t border-dashed border-slate-300 grid grid-cols-2 gap-6 text-center text-xs">
            <div>
              <div className="h-8 border-b border-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold block mt-1">Technician Signature</span>
            </div>
            <div>
              <div className="h-8 border-b border-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold block mt-1">Customer / Advisor Intake</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
