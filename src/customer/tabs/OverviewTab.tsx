import { ServiceTicket, Motorcycle } from '../../types/dashboard';
import {
  Wrench,
  Bike,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpRight
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
    { step: 3, name: 'Service', desc: 'Active repair' },
    { step: 4, name: 'Test', desc: 'Quality check' },
    { step: 5, name: 'Ready', desc: 'Pickup ready' },
  ];

  const latestRecord = serviceHistory.length > 0 ? serviceHistory[0] : null;

  return (
    <div className="space-y-6">
      {/* 1. Header Welcome & Quick Action Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-semibold tracking-wide border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>MotoCare Customer Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Garage & Service Dashboard
            </h2>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Track live repair progress, manage your motorcycles, and schedule official workshop maintenance with ease.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onBookClick()}
              className="bg-white hover:bg-blue-50 text-blue-900 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Schedule Service</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Three Unified Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Active Services
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {activeTickets.length > 0 ? `${activeTickets.length} Unit${activeTickets.length > 1 ? 's' : ''}` : '0 In Repair'}
            </div>
            <span className="text-xs text-slate-500 block">
              {activeTickets.length > 0 ? 'Currently in workshop bay' : 'All clear in workshop bay'}
            </span>
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            activeTickets.length > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Registered Garage Fleet */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              My Garage
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {motorcycles.length} Unit{motorcycles.length !== 1 ? 's' : ''}
            </div>
            <span className="text-xs text-slate-500 block">
              Registered motorcycles
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Bike className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Service Records */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Service Records
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {serviceHistory.length} Completed
            </div>
            <span className="text-xs text-slate-500 block">
              Past maintenance visits
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Live Service Status (Repair Tracker) */}
      {activeTickets.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Live Repair Progress</span>
            </h3>
            <span className="text-xs text-slate-500">
              Auto-updating via workshop terminal
            </span>
          </div>

          {activeTickets.map((ticket) => {
            const isReady = ticket.status === 'READY_FOR_PICKUP';
            const currentStage = isReady ? 5 : ticket.stage;

            return (
              <div
                key={ticket.id}
                className={`bg-white border border-slate-200 border-t-4 ${
                  isReady ? 'border-t-emerald-500' : 'border-t-blue-600'
                } rounded-2xl p-6 shadow-xs space-y-6`}
              >
                {/* Top Status & Booking Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                        {ticket.ticket_code}
                      </span>
                      {isReady ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Ready for Customer Pickup
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
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
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full transition cursor-pointer"
                          title="Cancel this service reservation"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel Booking</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Bike className="w-4 h-4 text-slate-400 shrink-0" />
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                        {ticket.motorcycles?.model || 'Motorcycle Unit'}{' '}
                        <span className="text-slate-500 font-mono text-xs font-normal">
                          ({ticket.motorcycles?.plate_number || 'N/A'})
                        </span>
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{ticket.service_type}</p>
                  </div>

                  <div className="text-left sm:text-right text-xs space-y-1">
                    <span className="text-slate-400 text-[11px] block uppercase font-medium">
                      {isReady ? 'Pickup Location' : 'Estimated Completion'}
                    </span>
                    <span className="font-bold text-slate-900 block text-sm">
                      {isReady ? 'Main Workshop Counter' : ticket.estimated_pickup}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Mechanic: <strong className="text-slate-800">{ticket.assigned_mechanic}</strong>
                    </span>
                  </div>
                </div>

                {/* 5-Step Visual Stepper */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Workshop Stage</span>
                    <span className={`font-semibold ${isReady ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {isReady
                        ? 'Stage 5 of 5: Ready for Release'
                        : `Stage ${currentStage} of 5: ${stages[currentStage - 1]?.name}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {stages.map((st) => {
                      const isDone = st.step <= currentStage;
                      const isCurrent = !isReady && st.step === currentStage;
                      return (
                        <div key={st.step} className="space-y-1.5 text-center">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${
                              isReady
                                ? 'bg-emerald-500'
                                : isDone
                                ? 'bg-blue-600'
                                : isCurrent
                                ? 'bg-blue-500 animate-pulse'
                                : 'bg-slate-200'
                            }`}
                          />
                          <div>
                            <span
                              className={`text-[11px] font-bold block ${
                                isReady
                                  ? 'text-emerald-700'
                                  : isCurrent
                                  ? 'text-blue-600'
                                  : isDone
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.name}
                            </span>
                            <span className="hidden sm:block text-[10px] text-slate-400">
                              {st.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info Footer Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Assigned Bay</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{ticket.assigned_bay}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Estimated Amount</span>
                    <span className="font-bold text-blue-700 font-mono text-xs sm:text-sm">{ticket.total_estimate}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Drop-off Schedule</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                      {ticket.dropoff_date || new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State / All Clear Banner */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                All Motorcycles Road-Ready
              </h3>
              <p className="text-xs text-slate-500">
                You have no active repair tickets. Keep your motorcycle performing at its best with routine preventive maintenance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onBookClick()}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>Book New Service</span>
          </button>
        </div>
      )}

      {/* 4. Balanced 2-Column Section: Garage & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): My Garage */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  My Garage
                </h3>
                <span className="text-[11px] text-slate-400 block">
                  Saved vehicles for quick booking
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
              {motorcycles.length} units
            </span>
          </div>

          {motorcycles.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bike className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">No motorcycles saved yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Book your first service and your vehicle will be saved here automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onBookClick()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <span>Book First Service</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {motorcycles.map((bike) => (
                <div
                  key={bike.id}
                  className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {bike.model}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {bike.plate_number}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Odometer: <strong className="text-slate-700 font-medium">{bike.odometer}</strong> • Next Service: <strong className="text-blue-700 font-medium">{bike.next_service || 'In 3,000 km'}</strong>
                    </div>
                  </div>

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
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
              <div className="pt-3.5 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-md text-[11px]">
                    {latestRecord.ticket_code}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(latestRecord.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                    Service Rendered
                  </span>
                  <span className="font-semibold text-slate-800 text-xs block">
                    {latestRecord.service_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                    <span className="text-slate-400 text-[10px] block font-medium">Mechanic</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block">{latestRecord.assigned_mechanic}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                    <span className="text-slate-400 text-[10px] block font-medium">Amount Billed</span>
                    <span className="font-bold text-blue-700 font-mono text-xs block">{latestRecord.total_estimate}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-600">No past service records yet</p>
                <p className="text-[11px] text-slate-400">Completed repair orders will be stored here.</p>
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
