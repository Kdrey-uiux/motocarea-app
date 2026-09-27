import { ServiceTicket, Motorcycle } from '../../types/dashboard';
import {
  Wrench,
  Bike,
  Clock,
  CheckCircle2,
  ChevronRight,
  X
} from 'lucide-react';

interface OverviewTabProps {
  activeTickets: ServiceTicket[];
  motorcycles: Motorcycle[];
  serviceHistory: ServiceTicket[];
  onBookClick: (bikeId?: string) => void;
  onCancelTicket?: (ticketId: string) => void;
}

export default function OverviewTab({
  activeTickets,
  motorcycles,
  serviceHistory,
  onBookClick,
  onCancelTicket,
}: OverviewTabProps) {
  const stages = [
    { step: 1, name: 'Intake' },
    { step: 2, name: 'Inspect' },
    { step: 3, name: 'Service' },
    { step: 4, name: 'Test' },
    { step: 5, name: 'Ready' },
  ];

  const latestRecord = serviceHistory.length > 0 ? serviceHistory[0] : null;

  return (
    <div className="space-y-6">
      {/* 1. Tatlong Pantay at Malinis na Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              Active Service
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {activeTickets.length > 0 ? `${activeTickets.length} Unit` : 'None'}
            </div>
            <span className="text-xs text-slate-400 block">
              {activeTickets.length > 0 ? 'Currently in workshop bay' : 'No ongoing repairs'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              Registered Motorcycles
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {motorcycles.length}
            </div>
            <span className="text-xs text-slate-400 block">
              In your garage
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Bike className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              Completed Records
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {serviceHistory.length}
            </div>
            <span className="text-xs text-slate-400 block">
              Past service visits
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. HIGHLIGHT #1: Active Repair Ticket Card na may Top Blue Accent */}
      {activeTickets.length > 0 && (
        <div className="space-y-4">
          {activeTickets.map((ticket) => {
            const isReady = ticket.status === 'READY_FOR_PICKUP';
            const currentStage = isReady ? 5 : ticket.stage;

            return (
              <div
                key={ticket.id}
                className={`bg-white border border-slate-200 border-t-4 ${
                  isReady ? 'border-t-emerald-500' : 'border-t-blue-600'
                } rounded-2xl p-6 shadow-xs space-y-5`}
              >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                          {ticket.ticket_code}
                        </span>
                        {isReady ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Ready for Pickup
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            In Progress
                          </span>
                        )}
                        {onCancelTicket && !isReady && (
                          <button
                            type="button"
                            onClick={() => onCancelTicket(ticket.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-2.5 py-0.5 rounded-full transition cursor-pointer"
                            title="Cancel this service reservation"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel Booking</span>
                          </button>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <Bike className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          {ticket.motorcycles?.model || 'Motorcycle Unit'}{' '}
                          <span className="text-slate-400 font-mono text-xs font-normal">
                            ({ticket.motorcycles?.plate_number || 'N/A'})
                          </span>
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{ticket.service_type}</p>
                    </div>

                    <div className="text-left sm:text-right text-xs space-y-0.5">
                      <span className="text-slate-400 text-[11px] block">
                        {isReady ? 'Service Complete' : 'Estimated Pickup'}
                      </span>
                      <span className="font-semibold text-slate-800 block text-sm">
                        {isReady ? 'Ready at Workshop' : ticket.estimated_pickup}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Mechanic: <strong className="text-slate-700">{ticket.assigned_mechanic}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">Repair Progress</span>
                      <span className={`font-semibold ${isReady ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {isReady
                          ? 'Ready for Release (Stage 5 of 5)'
                          : `Stage ${currentStage} of 5: ${stages[currentStage - 1]?.name}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {stages.map((st) => {
                        const isDone = st.step <= currentStage;
                        const isCurrent = !isReady && st.step === currentStage;
                        return (
                          <div key={st.step} className="space-y-1 text-center">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isReady
                                  ? 'bg-emerald-500'
                                  : isDone
                                  ? 'bg-blue-600'
                                  : isCurrent
                                  ? 'bg-blue-500 animate-pulse'
                                  : 'bg-slate-200'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-medium ${
                                isReady
                                  ? 'text-emerald-700 font-semibold'
                                  : isCurrent
                                  ? 'text-blue-600 font-semibold'
                                  : isDone
                                  ? 'text-slate-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

              {/* Info footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] block">Service Bay</span>
                  <span className="font-medium text-slate-800">{ticket.assigned_bay}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Estimated Cost</span>
                  <span className="font-bold text-slate-900 font-mono">{ticket.total_estimate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Drop-off Date</span>
                  <span className="font-medium text-slate-800">
                    {ticket.dropoff_date || new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* 3. Balanseng 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* HIGHLIGHT #2: Kaliwa (7 cols) - May Top Accent at Header Icon Badge */}
        <div className="lg:col-span-7 bg-white border border-slate-200 border-t-4 border-t-blue-500 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bike className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Registered Motorcycles
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              {motorcycles.length} units
            </span>
          </div>

          {motorcycles.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Bike className="w-7 h-7 text-slate-300 mx-auto" />
              <div className="text-xs text-slate-500">
                No saved motorcycles yet. Book your first service to register automatically!
              </div>
              <button
                type="button"
                onClick={() => onBookClick()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl transition shadow-xs"
              >
                <span>Book First Service</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {motorcycles.map((bike) => (
                <div
                  key={bike.id}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {bike.model}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {bike.plate_number}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Odometer: <span className="text-slate-600 font-medium">{bike.odometer}</span> • Next: <span className="text-slate-600 font-medium">{bike.next_service || 'In 3,000 km'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onBookClick(bike.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    <span>Book</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HIGHLIGHT #3: Kanan (5 cols) - May Top Green Accent at Verified Icon Badge */}
        <div className="lg:col-span-5 bg-white border border-slate-200 border-t-4 border-t-emerald-500 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent Service
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Completed
              </span>
            </div>

            {latestRecord ? (
              <div className="pt-3 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md text-[11px]">
                    {latestRecord.ticket_code}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(latestRecord.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block font-medium uppercase">Work Rendered</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-0.5">
                    {latestRecord.service_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-600">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Mechanic</span>
                    <span className="font-medium text-slate-800">{latestRecord.assigned_mechanic}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Amount Paid</span>
                    <span className="font-bold text-slate-800 font-mono">{latestRecord.total_estimate}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No past service records yet.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Official workshop maintenance record
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
