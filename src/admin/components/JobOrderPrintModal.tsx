import { Printer, X, Wrench, Shield, CheckSquare } from 'lucide-react';
import { AdminTicket } from '../../types/admin';

interface JobOrderPrintModalProps {
  ticket: AdminTicket | null;
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

  const modelName = ticket.motorcycles?.model || 'Motorcycle Unit';
  const plateNo = ticket.motorcycles?.plate_number || 'N/A';
  const odo = ticket.motorcycles?.odometer || '0 km';
  const customerName = ticket.profiles?.full_name || ticket.customer_name || 'Rider Guest';
  const customerPhone = ticket.profiles?.phone_number || ticket.customer_phone || 'N/A';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Controls Bar (Hidden during actual print) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Print Official Workshop Job Order (JO #{ticket.ticket_code})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Job Order</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans text-xs text-slate-800 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold">
                <Wrench className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                  MotoCare Service Center
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Santa Maria Main Workshop Hub • F. Halili Ave, Santa Maria, Bulacan
                </p>
                <p className="text-[10px] text-slate-500">
                  Tel: (044) 791-MOTOCARE • Email: service@motocare.ph
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Official Job Order
              </span>
              <span className="font-mono text-xl font-black text-slate-950">
                #{ticket.ticket_code}
              </span>
              <div className="text-[10px] text-slate-500 mt-1">
                Date: {new Date(ticket.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
              </div>
            </div>
          </div>

          {/* Section: Customer & Unit Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Customer Information
              </h2>
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900">{customerName}</div>
                <div className="text-slate-600">Contact: <span className="font-semibold text-slate-800">{customerPhone}</span></div>
                <div className="text-slate-600">Account Type: <span className="font-semibold text-slate-800">Verified MotoCare Rider</span></div>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Motorcycle Particulars
              </h2>
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900">{modelName}</div>
                <div className="text-slate-600">
                  Plate / MV File: <span className="font-mono font-bold text-slate-900">{plateNo}</span>
                </div>
                <div className="text-slate-600">
                  Odometer Reading: <span className="font-semibold text-slate-800">{odo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Service Assignment */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-800 uppercase text-[10px] tracking-wider">
              Workshop Dispatch & Technical Scope
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Package Requested</span>
                  <span className="text-sm font-bold text-slate-900">{ticket.service_type}</span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Cost</span>
                  <span className="text-base font-extrabold text-blue-700">{ticket.total_estimate}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block">Assigned Bay:</span>
                  <span className="font-bold text-slate-800">{ticket.assigned_bay || 'Bay 01 - Quick Lane'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Technician In-Charge:</span>
                  <span className="font-bold text-slate-800">{ticket.assigned_mechanic || 'Kuya Jun (Lead Tech)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estimated Pickup:</span>
                  <span className="font-bold text-slate-800">{ticket.estimated_pickup || 'Same Day Release'}</span>
                </div>
              </div>

              {ticket.notes && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 text-[11px] text-amber-900">
                  <span className="font-bold">Customer Remarks:</span> {ticket.notes}
                </div>
              )}
            </div>
          </div>

          {/* Section: Inspection Checklist */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Standard 15-Point Multi-Check Status
            </h3>
            <div className="grid grid-cols-3 gap-2 text-[10px] border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Engine Oil Level</div>
              <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Tire PSI & Thread</div>
              <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Brake Pad Wear</div>
              <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Belt / Chain Slack</div>
              <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Stator & Battery Load</div>
              <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Headlight & Signal Lights</div>
            </div>
          </div>

          {/* Terms & Authorization */}
          <div className="text-[9px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
            <div className="flex items-center gap-1 font-bold text-slate-700 mb-0.5">
              <Shield className="w-3 h-3 text-slate-600" />
              CUSTOMER AUTHORIZATION & WARRANTY TERMS
            </div>
            I hereby authorize the repair and diagnostic work described above to be performed along with the necessary materials. MotoCare and its technicians are granted permission to operate the vehicle for purpose of testing, inspection, or delivery.
          </div>

          {/* Signatures Area */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center">
            <div>
              <div className="border-b border-slate-400 h-8" />
              <div className="text-[10px] font-bold text-slate-800 mt-1">Customer / Rider Signature</div>
              <div className="text-[9px] text-slate-500">Authorized Vehicle Owner</div>
            </div>

            <div>
              <div className="border-b border-slate-400 h-8" />
              <div className="text-[10px] font-bold text-slate-800 mt-1">Service Advisor Signature</div>
              <div className="text-[9px] text-slate-500">Intake Desk Officer</div>
            </div>

            <div>
              <div className="border-b border-slate-400 h-8" />
              <div className="text-[10px] font-bold text-slate-800 mt-1">Quality Inspector / Mechanic</div>
              <div className="text-[9px] text-slate-500">Post-Service Road Tester</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
