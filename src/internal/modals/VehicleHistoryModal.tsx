import { createPortal } from 'react-dom';
import { InternalTicket } from '../types/internal';
import { X, Bike, Calendar, UserCheck, Phone } from '../../components/icons';
import { stageName } from '../../utils/serviceStages';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

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

/** Plain-language status for a past or current visit */
function visitStatus(t: InternalTicket): { label: string; dot: string } {
  switch (t.status) {
    case 'COMPLETED':
      return { label: 'Released', dot: 'bg-emerald-500' };
    case 'CANCELLED':
    case 'CANCELLED_BY_ADMIN':
      return { label: 'Cancelled', dot: 'bg-slate-400' };
    case 'MISSED':
    case 'NO_SHOW':
      return { label: 'Missed', dot: 'bg-rose-500' };
    case 'READY_FOR_PICKUP':
      return { label: 'Ready for pickup', dot: 'bg-orange-500' };
    default:
      return { label: `Stage ${t.stage} · ${stageName(t.stage)}`, dot: 'bg-orange-500' };
  }
}

/** Every visit of one motorcycle (by plate), newest first */
export default function VehicleHistoryModal({ vehicle, tickets, isOpen, onClose }: VehicleHistoryModalProps) {
  if (!isOpen || !vehicle) return null;

  const vehiclePlate = vehicle.plate_number.toUpperCase();
  const visits = tickets
    .filter((t) => (t.motorcycles?.plate_number || '').toUpperCase() === vehiclePlate)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const released = visits.filter((t) => t.status === 'COMPLETED').length;
  const hasPhone = vehicle.owner_phone && vehicle.owner_phone !== 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <div className="bg-white w-full max-w-2xl rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 truncate" title={vehicle.model}>
                {vehicle.model}
              </h3>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {vehicle.plate_number}
                </span>
                Service history
              </p>
            </div>
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

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Owner + totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <span className="block text-xs text-slate-400">Owner</span>
              <span className="block font-medium text-slate-900 truncate">{vehicle.owner_name || 'Rider'}</span>
              {hasPhone && (
                <a href={`tel:${vehicle.owner_phone}`} className="text-xs text-slate-500 hover:text-orange-600 inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {vehicle.owner_phone}
                </a>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <span className="block text-xs text-slate-400">Visits</span>
              <span className="font-display text-2xl font-bold text-slate-900">{visits.length}</span>
              <span className="text-xs text-slate-500"> · {released} released</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <span className="block text-xs text-slate-400">Mileage</span>
              <span className="font-display text-2xl font-bold text-slate-900">{vehicle.odometer || '—'}</span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="font-display text-base font-bold text-slate-900 mb-3">Visits, newest first</h4>
            {visits.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400 rounded-2xl border border-dashed border-slate-200">
                No visits recorded for this motorcycle yet.
              </p>
            ) : (
              <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {visits.map((t) => {
                  const status = visitStatus(t);
                  const mechanic = t.assigned_mechanic && t.assigned_mechanic !== 'Queued for Assignment' ? t.assigned_mechanic : null;
                  return (
                    <li key={t.id} className="relative pl-7">
                      <span className={`absolute left-0 top-4 w-[15px] h-[15px] rounded-full border-[3px] border-white ${status.dot} shadow-sm`} />
                      <div className="rounded-2xl border border-slate-200/80 px-4 py-3 hover:border-orange-200 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{t.service_type}</p>
                            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                              <span className="font-mono">{t.ticket_code}</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {mechanic && (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                  {mechanic}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
