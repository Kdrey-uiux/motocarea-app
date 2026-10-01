import { ServiceTicket, Motorcycle } from '../../types/dashboard';
import {
  Wrench,
  Bike,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  ShieldCheck,
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
    { step: 1, name: 'Intake', desc: 'Checked in' },
    { step: 2, name: 'Inspect', desc: 'Diagnostics' },
    { step: 3, name: 'Service', desc: 'In repair' },
    { step: 4, name: 'Test', desc: 'Quality test' },
    { step: 5, name: 'Ready', desc: 'Ready for pickup' },
  ];

  const latestRecord = serviceHistory.length > 0 ? serviceHistory[0] : null;

  return (
    <div className="space-y-5">
      {/* 1. Facebook-Style Metric Cards (Clean Sans-Serif, No Mono, No All-Caps) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Services */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              Active Services
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeTickets.length > 0
                ? `${activeTickets.length} Unit${activeTickets.length > 1 ? 's' : ''}`
                : '0 In Repair'}
            </div>
            <span className="text-xs text-slate-400 block">
              {activeTickets.length > 0
                ? 'Currently in workshop bay'
                : 'No ongoing workshop repairs'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* My Garage */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              My Garage
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {motorcycles.length} Motorcycle{motorcycles.length !== 1 ? 's' : ''}
            </div>
            <span className="text-xs text-slate-400 block">
              Registered in your profile
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Visits */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              Service Records
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {serviceHistory.length} Completed
            </div>
            <span className="text-xs text-slate-400 block">
              Past verified workshop visits
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Live Service Status (Repair Tracker) */}
      {activeTickets.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Live Repair Progress</span>
            </h3>
            <span className="text-xs text-slate-400">
              Live workshop updates
            </span>
          </div>

          {activeTickets.map((ticket) => {
            const isReady = ticket.status === 'READY_FOR_PICKUP';
            const currentStage = isReady ? 5 : ticket.stage;

            return (
              <div
                key={ticket.id}
                className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-5"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                        {ticket.ticket_code}
                      </span>
                      {isReady ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Ready for Customer Pickup
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                          In Progress • {ticket.assigned_bay || 'Bay Assigned'}
                        </span>
                      )}

                      {onCancelTicket && !isReady && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this booking?')) {
                              onCancelTicket(ticket.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                          title="Cancel this reservation"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel Booking</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <Bike className="w-4 h-4 text-slate-400 shrink-0" />
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                        {ticket.motorcycles?.model || 'Motorcycle Unit'}{' '}
                        <span className="text-slate-500 text-xs font-normal">
                          ({ticket.motorcycles?.plate_number || 'N/A'})
                        </span>
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{ticket.service_type}</p>
                  </div>

                  <div className="text-left sm:text-right text-xs space-y-0.5">
                    <span className="text-slate-400 text-[11px] block">
                      {isReady ? 'Pickup Location' : 'Estimated Completion'}
                    </span>
                    <span className="font-bold text-slate-900 block text-sm">
                      {isReady ? 'Main Counter' : ticket.estimated_pickup}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Mechanic: <strong className="text-slate-700">{ticket.assigned_mechanic}</strong>
                    </span>
                  </div>
                </div>

                {/* 5-Stage Stepper */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Service Progress</span>
                    <span className={`font-semibold ${isReady ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {isReady
                        ? 'Completed (Stage 5 of 5)'
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
                            className={`h-2 rounded-full transition-all duration-300 ${
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
                            className={`text-[11px] font-semibold block ${
                              isReady
                                ? 'text-emerald-700'
                                : isCurrent
                                ? 'text-blue-600'
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

                {/* Footer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Service Bay</span>
                    <span className="font-semibold text-slate-800">{ticket.assigned_bay}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Estimated Total</span>
                    <span className="font-bold text-slate-900">{ticket.total_estimate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Drop-off Date</span>
                    <span className="font-semibold text-slate-800">
                      {ticket.dropoff_date || new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean Informative Road-Ready Banner (WITHOUT duplicate Book button) */
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              All Motorcycles Road-Ready
            </h3>
            <p className="text-xs text-slate-500">
              You have no active repair tickets. All vehicles in your garage are in good standing.
            </p>
          </div>
        </div>
      )}

      {/* 3. Balanced 2-Column Section (My Garage & Recent History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): My Garage */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  My Garage
                </h3>
                <span className="text-[11px] text-slate-400 block">
                  Saved vehicles for fast booking
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
              {motorcycles.length} units
            </span>
          </div>

          {motorcycles.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Bike className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600">No motorcycles saved yet</p>
              <p className="text-xs text-slate-400">
                Book your first service and your vehicle will be registered automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {motorcycles.map((bike) => (
                <div
                  key={bike.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {bike.model}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {bike.plate_number}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Odometer: <strong className="text-slate-700 font-semibold">{bike.odometer}</strong> • Next Service: <strong className="text-blue-600 font-semibold">{bike.next_service || 'In 3,000 km'}</strong>
                    </div>
                  </div>

                  {/* Clean bike-specific booking action */}
                  <button
                    type="button"
                    onClick={() => onBookClick(bike.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                    title="Book service for this motorcycle"
                  >
                    <span>Book</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Recent Service History */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Recent History
                  </h3>
                  <span className="text-[11px] text-slate-400 block">
                    Last completed workshop visit
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>

            {latestRecord ? (
              <div className="pt-3 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-md text-[11px]">
                    {latestRecord.ticket_code}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(latestRecord.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="text-slate-400 text-[10px] block font-semibold">
                    Service Rendered
                  </span>
                  <span className="font-semibold text-slate-800 text-xs block">
                    {latestRecord.service_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                    <span className="text-slate-400 text-[10px] block">Mechanic</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block">
                      {latestRecord.assigned_mechanic}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                    <span className="text-slate-400 text-[10px] block">Amount Paid</span>
                    <span className="font-bold text-slate-900 text-xs block">
                      {latestRecord.total_estimate}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <Clock className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                <p className="font-medium text-slate-600">No past service records yet</p>
                <p className="text-[11px] text-slate-400">Completed repair logs will appear here.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Official digital warranty & workshop history log</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
