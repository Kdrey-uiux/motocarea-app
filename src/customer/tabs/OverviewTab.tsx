import { ServiceTicket, Motorcycle, UserProfile } from '../../types/dashboard';
import {
  Wrench,
  Calendar,
  Plus,
  ChevronDown,
  ArrowUpRight,
  Radio,
  Clock,
  ArrowUp,
  ArrowDown,
  Activity,
  ShieldCheck,
} from 'lucide-react';

interface OverviewTabProps {
  userProfile?: UserProfile | null;
  activeTickets: ServiceTicket[];
  motorcycles: Motorcycle[];
  serviceHistory: ServiceTicket[];
  onBookClick: (bikeId?: string) => void;
  onViewHistoryClick?: () => void;
  onCancelTicket?: (ticketId: string) => void;
}

export default function OverviewTab({
  userProfile,
  activeTickets,
  motorcycles,
  serviceHistory,
  onBookClick,
  onViewHistoryClick,
}: OverviewTabProps) {
  const activeTicket = activeTickets.length > 0 ? activeTickets[0] : null;
  const primaryBike = motorcycles.length > 0 ? motorcycles[0] : null;
  const isReady = activeTicket?.status === 'READY_FOR_PICKUP';
  const currentStage = activeTicket ? (isReady ? 5 : activeTicket.stage) : 0;

  const stages = [
    { step: 1, key: 'JAN', name: 'Intake', height: 'h-24' },
    { step: 2, key: 'FEB', name: 'Inspect', height: 'h-32' },
    { step: 3, key: 'MAR', name: 'Service', height: 'h-40' },
    { step: 4, key: 'APR', name: 'Test', height: 'h-28' },
    { step: 5, key: 'MAY', name: 'Ready', height: 'h-36' },
  ];

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Header Greeting & Action Row (Matches Reference Design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-light text-slate-700 tracking-tight">
            Welcome Back,{' '}
            <span className="font-semibold text-slate-900">
              {userProfile?.full_name?.split(' ')[0] || 'Rider'}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Date Indicator Pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-600 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Today, {currentDateStr}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </div>

          {/* Primary Action Pill */}
          <button
            type="button"
            onClick={() => onBookClick()}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 py-2 text-xs sm:text-sm font-semibold shadow-sm shadow-orange-500/20 flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Service</span>
          </button>
        </div>
      </div>

      {/* 2. Top Bento Grid Row (3 Cards: VIP Pass, Striped Bar Stepper, Wavy Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Primary Motorcycle VIP Pass (Matches Green VISA Card in Reference) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Primary Motorcycle
              </h3>
              <p className="text-xs text-slate-400">Total registered in fleet</p>
            </div>
            <button
              type="button"
              onClick={() => onBookClick(primaryBike?.id)}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition cursor-pointer"
              title="View Motorcycle Details"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* VIP Garage Card (Cool Emerald / Slate Luxury Card) */}
          <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950 rounded-2xl p-5 text-white shadow-md relative overflow-hidden space-y-4">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-300">
                MotoCare Pass
              </span>
              <Radio className="w-4 h-4 text-emerald-300 rotate-90" />
            </div>

            <div className="relative z-10 space-y-0.5">
              <div className="text-[11px] text-emerald-200/80 font-medium uppercase tracking-wide">
                {primaryBike?.model || 'Yamaha Mio i 125'}
              </div>
              <div className="text-2xl font-bold tracking-tight text-white">
                {primaryBike?.plate_number || 'ABC 123'}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-200/90 pt-1 border-t border-emerald-500/20 relative z-10">
              <span className="font-mono">•••• 909090</span>
              <span>{primaryBike?.next_service || 'PMS: 3,000 KM'}</span>
            </div>
          </div>

          {/* Bottom Card Stat */}
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-400 block font-medium">Workshop Status</span>
              <div className="text-lg font-bold text-slate-900">
                {activeTicket ? `${activeTickets.length} Active Unit` : 'Road-Ready'}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {activeTicket ? 'In Progress' : '+100% Road'}
            </span>
          </div>
        </div>

        {/* Card 2: Live Workshop Progress (Matches "Engagement Rate" Striped Pillars in Reference) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Workshop Progress
                </h3>
                <p className="text-xs text-slate-400">Live service stage tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full text-[11px] font-medium text-slate-600">
                <span className="px-2.5 py-0.5 rounded-full">Stages</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white font-semibold shadow-xs">
                  Live
                </span>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Striped Pillars Chart Layout (Matches Reference Image) */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-48 px-2 pb-2">
              {stages.map((st) => {
                const isActivePillar = activeTicket
                  ? st.step === currentStage
                  : st.step === 3;
                const isPassedPillar = activeTicket
                  ? st.step < currentStage
                  : false;

                return (
                  <div key={st.step} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                    {/* Active Floating Badge (Matches `+17.8%` pill in Reference) */}
                    {isActivePillar && (
                      <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-emerald-900 text-white text-[10px] font-bold shadow-md z-10 flex items-center gap-0.5 animate-bounce">
                        <span>●</span>
                        <span>{activeTicket ? st.name : 'Ready'}</span>
                      </div>
                    )}

                    {/* Striped Pill Column */}
                    <div
                      className={`w-full rounded-2xl transition-all duration-300 relative overflow-hidden ${
                        isActivePillar
                          ? 'bg-orange-500 shadow-md shadow-orange-500/25 h-36'
                          : isPassedPillar
                          ? 'bg-emerald-200/90 h-28'
                          : `${st.height} bg-slate-100`
                      }`}
                      style={{
                        backgroundImage: !isActivePillar
                          ? 'repeating-linear-gradient(45deg, rgba(16,185,129,0.18), rgba(16,185,129,0.18) 4px, transparent 4px, transparent 8px)'
                          : undefined,
                      }}
                    />

                    {/* Stage Label Below Pillar */}
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mt-2.5">
                      {st.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              {activeTicket ? (
                <>Bay: <strong className="text-slate-800 font-semibold">{activeTicket.assigned_bay}</strong></>
              ) : (
                'All workshop bays ready for booking'
              )}
            </span>
            <span className="text-slate-400">
              {activeTicket ? activeTicket.estimated_pickup : '0 Ongoing Maintenance'}
            </span>
          </div>
        </div>

        {/* Card 3: Vehicle Care & Wavy Chart (Matches "Payment Goal" in Reference) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Vehicle Care</h3>
              <p className="text-xs text-slate-400">Maintenance score</p>
            </div>
            <button
              type="button"
              onClick={onViewHistoryClick}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-medium">Total Maintenance</span>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ₱3,450.00
            </div>
          </div>

          {/* Smooth Wavy Line Chart (SVG Bezier Curve from Reference Image) */}
          <div className="w-full h-20 relative overflow-hidden py-1">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 240 60"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Fill area under curve */}
              <path
                d="M 0,40 Q 30,15 60,35 T 120,20 T 180,45 T 240,15 L 240,60 L 0,60 Z"
                fill="url(#waveGradient)"
              />
              {/* Green Smooth Curve Line */}
              <path
                d="M 0,40 Q 30,15 60,35 T 120,20 T 180,45 T 240,15"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Pulse dots along the line */}
              <circle cx="60" cy="35" r="3" fill="#10b981" />
              <circle cx="120" cy="20" r="3" fill="#10b981" />
              <circle cx="240" cy="15" r="4" fill="#059669" className="animate-pulse" />
            </svg>
          </div>

          {/* Dual Action Pills (Matches `Send ↑` and `Receive ↓` in Reference) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onBookClick()}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white rounded-full py-2 px-3 text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <span>Book</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onViewHistoryClick}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full py-2 px-3 text-xs font-semibold shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <span>History</span>
              <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bento Grid Row (Payment History Table & Right Side Stat Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bottom Left: Recent Service Records Table (Matches "Payment History" in Reference) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Service History
              </h3>
              <p className="text-xs text-slate-400">Recent official workshop records</p>
            </div>
            <button
              type="button"
              onClick={onViewHistoryClick}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 text-[11px] font-semibold border-b border-slate-100 pb-2">
                  <th className="py-2.5 font-normal">Service Name</th>
                  <th className="py-2.5 font-normal">Date</th>
                  <th className="py-2.5 font-normal">Time</th>
                  <th className="py-2.5 font-normal">Status</th>
                  <th className="py-2.5 font-normal text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {serviceHistory.length > 0 ? (
                  serviceHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[160px] sm:max-w-xs">{item.service_type}</span>
                      </td>
                      <td className="py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        10:30 AM
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Successful
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {item.total_estimate}
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {/* Realistic Records Styled Like Reference Image */}
                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[160px] sm:max-w-xs">Full Preventive Maintenance (PMS)</span>
                      </td>
                      <td className="py-3.5 text-slate-500 whitespace-nowrap">16 Jun 2025</td>
                      <td className="py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">10:30 PM</td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Successful
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₱1,250.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[160px] sm:max-w-xs">CVT Cleaning & Belt Check</span>
                      </td>
                      <td className="py-3.5 text-slate-500 whitespace-nowrap">15 Jun 2025</td>
                      <td className="py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">11:45 PM</td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Successful
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₱850.00
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[160px] sm:max-w-xs">Synthetic Oil & Filter Replacement</span>
                      </td>
                      <td className="py-3.5 text-slate-500 whitespace-nowrap">14 Jun 2025</td>
                      <td className="py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">10:15 PM</td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Successful
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₱1,345.00
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right: Stacked Sub-Cards (Matches "Amount of credit" & "Mandatory Payments") */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5">
          {/* Sub-Card 1: Next Service Milestone (Matches "Amount of credit" in Reference) */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Next Service Due</h4>
                <p className="text-[11px] text-slate-400">Preventive maintenance counter</p>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                3,000 km
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                On Schedule
              </span>
            </div>
          </div>

          {/* Sub-Card 2: Workshop Specialists Team (Matches "Mandatory Payments" with circular team avatars) */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Workshop Specialists</h4>
                <p className="text-[11px] text-slate-400">Certified technicians on duty</p>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Overlapping Team Avatars */}
            <div className="flex items-center -space-x-2 pt-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-xs" title="Juan Dela Cruz - Master Technician">
                JD
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-400 to-rose-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-xs" title="Mark Santos - Electrical Specialist">
                MS
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-xs" title="Ryan Torres - Diagnostic Tech">
                RT
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-xs" title="Alex Lim - Engine Specialist">
                AL
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-800 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-xs" title="2 more certified technicians">
                +2
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
