import { useState, useMemo } from 'react';
import { InternalTicket } from '../types/internal';
import { 
  Wrench, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Plus, 
  X
} from 'lucide-react';

interface InternalBaysTabProps {
  tickets: InternalTicket[];
  onOpenDispatch: (ticket: InternalTicket) => void;
  onRefresh?: () => void;
}

export function normalizeBayNumber(bayStr?: string | null): number | null {
  if (!bayStr) return null;
  const match = bayStr.match(/(?:bay|lift|#)?[\s-]*0?(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

const ALL_WORKSHOP_BAYS = [
  {
    id: 'bay-1',
    bayNumber: '01',
    name: 'Bay 01',
    type: 'Change Oil & Quick Service',
  },
  {
    id: 'bay-2',
    bayNumber: '02',
    name: 'Bay 02',
    type: 'CVT Cleaning & Tuning',
  },
  {
    id: 'bay-3',
    bayNumber: '03',
    name: 'Bay 03',
    type: 'Engine Repair & Overhaul',
  },
  {
    id: 'bay-4',
    bayNumber: '04',
    name: 'Bay 04',
    type: 'Electrical & Wiring',
  },
  {
    id: 'bay-5',
    bayNumber: '05',
    name: 'Bay 05',
    type: 'Brakes & Suspension',
  },
  {
    id: 'bay-6',
    bayNumber: '06',
    name: 'Bay 06',
    type: 'FI Cleaning & Tuning',
  },
  {
    id: 'bay-7',
    bayNumber: '07',
    name: 'Bay 07',
    type: 'Tires & Vulcanizing',
  },
  {
    id: 'bay-8',
    bayNumber: '08',
    name: 'Bay 08',
    type: 'General Service',
  },
  {
    id: 'bay-9',
    bayNumber: '09',
    name: 'Bay 09',
    type: 'Major Repair',
  },
  {
    id: 'bay-10',
    bayNumber: '10',
    name: 'Bay 10',
    type: 'Final Check & Detailing',
  },
];

const BAY_MAINTENANCE_KEY = 'motocare_bay_maintenance_flags';

export default function InternalBaysTab({
  tickets,
  onOpenDispatch,
}: InternalBaysTabProps) {
  // Maintenance state per bay
  // Toggle maintenance state per bay
  const [maintenanceBays, setMaintenanceBays] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(BAY_MAINTENANCE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Quick Dispatch Selection Modal State for vacant bay
  const [dispatchTargetBay, setDispatchTargetBay] = useState<string | null>(null);

  const toggleMaintenance = (bayId: string) => {
    setMaintenanceBays((prev) => {
      const updated = { ...prev, [bayId]: !prev[bayId] };
      try {
        localStorage.setItem(BAY_MAINTENANCE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Map tickets to all 10 official workshop bays using exact integer normalization
  const baysData = useMemo(() => {
    return ALL_WORKSHOP_BAYS.map((staticBay) => {
      const isUnderMaintenance = !!maintenanceBays[staticBay.id];
      const bayNumInt = parseInt(staticBay.bayNumber, 10);

      const matchingTicket = tickets.find(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'CANCELLED_BY_ADMIN' &&
          t.status !== 'MISSED' &&
          t.status !== 'NO_SHOW' &&
          t.assigned_bay &&
          normalizeBayNumber(t.assigned_bay) === bayNumInt
      );

      if (isUnderMaintenance) {
        return {
          ...staticBay,
          status: 'MAINTENANCE' as const,
          activeTicket: undefined,
        };
      }

      if (matchingTicket) {
        return {
          ...staticBay,
          status: 'OCCUPIED' as const,
          activeTicket: matchingTicket,
        };
      }

      return {
        ...staticBay,
        status: 'AVAILABLE' as const,
        activeTicket: undefined,
      };
    });
  }, [tickets, maintenanceBays]);


  // Queue tickets eligible for dispatch
  const queueTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.stage === 1 &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN' &&
        t.status !== 'MISSED'
    );
  }, [tickets]);

  const vacantLiftsCount = baysData.filter((b) => b.status === 'AVAILABLE').length;
  const occupiedLiftsCount = baysData.filter((b) => b.status === 'OCCUPIED').length;
  const maintenanceLiftsCount = baysData.filter((b) => b.status === 'MAINTENANCE').length;

  return (
    <div className="space-y-6">
      {/* 1. Header with Operational Summary */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Workshop Bays
              </h2>
              <p className="text-xs text-slate-500">
                Monitor active workshop bays and ongoing motorcycle repairs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 shadow-2xs">
            {vacantLiftsCount} Available
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200/80 shadow-2xs">
            {occupiedLiftsCount} Occupied
          </span>
          {maintenanceLiftsCount > 0 && (
            <span className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200/80 shadow-2xs">
              {maintenanceLiftsCount} Maintenance
            </span>
          )}
        </div>
      </div>

      {/* 10-Bay Workshop Floor Schematic Grid (2 Rows of 5 Bays) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {baysData.map((bay) => {
          const isOccupied = bay.status === 'OCCUPIED' && bay.activeTicket;
          const isMaintenance = bay.status === 'MAINTENANCE';

          return (
            <div
              key={bay.id}
              className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                isMaintenance
                  ? 'border-rose-200 bg-rose-50/20'
                  : isOccupied
                  ? 'border-amber-300 bg-amber-50/15 ring-1 ring-amber-300/50'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Bay Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isMaintenance
                          ? 'bg-rose-100 text-rose-700'
                          : isOccupied
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {bay.bayNumber}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-slate-900 leading-tight truncate">{bay.name}</h3>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{bay.type}</p>
                    </div>
                  </div>

                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                      isMaintenance
                        ? 'bg-rose-500'
                        : isOccupied
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                    title={isMaintenance ? 'Under Maintenance' : isOccupied ? 'Occupied' : 'Available'}
                  />
                </div>

                {/* Status Content */}
                {isMaintenance ? (
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold text-rose-800 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Offline for Servicing</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMaintenance(bay.id)}
                      className="text-[10px] text-rose-700 hover:underline font-bold cursor-pointer"
                    >
                      Mark as Online →
                    </button>
                  </div>
                ) : isOccupied && bay.activeTicket ? (
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-orange-600 text-xs">
                        #{bay.activeTicket.ticket_code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                        Stage {bay.activeTicket.stage}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-slate-600">
                      <span className="font-bold text-slate-900 block truncate text-xs">
                        {bay.activeTicket.motorcycles?.model || 'Motorcycle'}
                      </span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono bg-slate-100 px-1 rounded text-slate-700 text-[10px]">
                          {bay.activeTicket.motorcycles?.plate_number || 'NO PLATE'}
                        </span>
                        <span className="text-slate-500 text-[10px] truncate max-w-[80px]">
                          {bay.activeTicket.assigned_mechanic || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs flex flex-col items-center justify-center text-center gap-1 text-emerald-800 py-3.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold">Lift Available</span>
                  </div>
                )}
              </div>

              {/* Action Button at Bottom */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleMaintenance(bay.id)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {isMaintenance ? 'Clear' : 'Service'}
                </button>

                {isOccupied && bay.activeTicket ? (
                  <button
                    type="button"
                    onClick={() => onOpenDispatch(bay.activeTicket!)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : !isMaintenance ? (
                  <button
                    type="button"
                    onClick={() => setDispatchTargetBay(`Bay ${bay.bayNumber}`)}
                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Assign</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Dispatch Modal for Vacant Bay */}
      {dispatchTargetBay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Assign Motorcycle to {dispatchTargetBay}
                </h3>
                <p className="text-xs text-slate-500">
                  Select a queued motorcycle from Stage 1 intake to assign to this bay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDispatchTargetBay(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
              {queueTickets.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl italic">
                  No motorcycles in queue waiting for bay assignment.
                </div>
              ) : (
                queueTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setDispatchTargetBay(null);
                      onOpenDispatch({ ...t, assigned_bay: dispatchTargetBay });
                    }}
                    className="p-3 bg-white border border-slate-200 hover:border-orange-500 rounded-xl flex items-center justify-between cursor-pointer transition hover:shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span className="font-mono text-orange-600">#{t.ticket_code}</span>
                        <span>{t.motorcycles?.model || 'Motorcycle'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t.customer_name} • {t.service_type}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 bg-orange-500 text-white font-bold rounded-lg text-[11px] shrink-0">
                      Assign to Bay
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDispatchTargetBay(null)}
                className="px-4 py-2 text-slate-500 font-bold text-xs cursor-pointer hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
