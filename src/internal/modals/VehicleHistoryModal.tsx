import { InternalTicket } from '../types/internal';
import { 
  X, 
  Bike, 
  Calendar, 
  Wrench 
} from 'lucide-react';

interface VehicleHistoryModalProps {
  vehicle: {
    plate_number: string;
    model: string;
    year_model?: string;
    odometer?: string;
    owner_name?: string;
    owner_phone?: string;
  } | null;
  tickets: InternalTicket[];
  isOpen: boolean;
  onClose: () => void;
}

export default function VehicleHistoryModal({
  vehicle,
  tickets,
  isOpen,
  onClose,
}: VehicleHistoryModalProps) {
  if (!isOpen || !vehicle) return null;

  const vehiclePlate = vehicle.plate_number.toUpperCase();

  // Find all past tickets for this vehicle
  const pastTickets = tickets.filter((t) => {
    const ticketPlate = (t.motorcycles?.plate_number || '').toUpperCase();
    return ticketPlate === vehiclePlate;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Vehicle Service Log & Maintenance History
              </h3>
              <p className="text-[11px] text-slate-400">
                {vehicle.model} • Plate: {vehicle.plate_number}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Vehicle Metadata Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Owner</span>
              <span className="font-bold text-slate-900 truncate block">{vehicle.owner_name || 'Rider Customer'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact</span>
              <span className="font-medium text-slate-700">{vehicle.owner_phone || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Services</span>
              <span className="font-black text-slate-900 text-sm">{pastTickets.length} visits</span>
            </div>
          </div>

          {/* Past Service Timeline */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Chronological Service Log
            </h4>

            {pastTickets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80 italic">
                No past service orders logged yet for this vehicle.
              </div>
            ) : (
              <div className="space-y-3">
                {pastTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 hover:border-orange-200 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-600 text-xs">
                          #{t.ticket_code}
                        </span>
                        <span className="font-bold text-slate-900">{t.service_type}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(t.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {t.assigned_mechanic && (
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-slate-400" />
                          Tech: {t.assigned_mechanic}
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
}
