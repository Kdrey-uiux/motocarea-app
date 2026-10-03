import { useState, useEffect, useMemo } from 'react';
import { ServiceTicket, Motorcycle, UserProfile } from '../../types/dashboard';
import {
  Wrench,
  Plus,
  Radio,
  Clock,
  Bike,
  Info,
  XCircle
} from 'lucide-react';

interface OverviewTabProps {
  userProfile?: UserProfile | null;
  activeTickets: ServiceTicket[];
  motorcycles: Motorcycle[];
  serviceHistory: ServiceTicket[];
  onBookClick: (bikeId?: string) => void;
  onViewHistoryClick?: () => void;
  onRequestCancelTicket?: (ticket: ServiceTicket) => void;
}

export default function OverviewTab({
  userProfile,
  activeTickets,
  motorcycles,
  serviceHistory,
  onBookClick,
  onViewHistoryClick,
  onRequestCancelTicket,
}: OverviewTabProps) {
  // Support switching between multiple active booked motorcycles
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    activeTickets.length > 0 ? activeTickets[0].id : ''
  );

  // Keep selected ticket synchronized when activeTickets changes
  useEffect(() => {
    if (activeTickets.length > 0) {
      if (!activeTickets.some((t) => t.id === selectedTicketId)) {
        setSelectedTicketId(activeTickets[0].id);
      }
    } else {
      setSelectedTicketId('');
    }
  }, [activeTickets, selectedTicketId]);

  const activeTicket =
    activeTickets.find((t) => t.id === selectedTicketId) ||
    (activeTickets.length > 0 ? activeTickets[0] : null);

  const primaryBike = motorcycles.length > 0 ? motorcycles[0] : null;

  // Exact booked motorcycle details
  const activeBikeModel = activeTicket?.motorcycles?.model || primaryBike?.model || 'Motorcycle Unit';
  const activeBikePlate = activeTicket?.motorcycles?.plate_number || primaryBike?.plate_number || 'N/A';

  const isReady = activeTicket?.status === 'READY_FOR_PICKUP';
  const currentStage = activeTicket ? (isReady ? 5 : activeTicket.stage) : 0;

  // Interactive Stage Inspection State (Defaults to active stage or Stage 1)
  const [inspectedStageStep, setInspectedStageStep] = useState<number>(currentStage > 0 ? currentStage : 1);

  // Synchronize inspected stage whenever active ticket changes
  useEffect(() => {
    if (activeTicket) {
      const stage = activeTicket.status === 'READY_FOR_PICKUP' ? 5 : activeTicket.stage;
      setInspectedStageStep(stage > 0 ? stage : 1);
    }
  }, [activeTicket?.id, activeTicket?.stage, activeTicket?.status]);

  const stages = [
    {
      step: 1,
      name: 'Intake',
      tag: 'Check-in',
      height: 'h-24',
      summary: 'Vehicle Intake & Registration',
      desc: 'Vehicle received at workshop, initial odometer reading recorded, keys logged into workshop lockbox, and unit transferred to the assigned service bay.',
    },
    {
      step: 2,
      name: 'Inspect',
      tag: 'Diagnostics',
      height: 'h-32',
      summary: '21-Point Multi-System Diagnostic Check',
      desc: 'Mechanics inspect brake pad thickness, battery voltage, spark plug gap, tire tread depth, and check for any reported electrical or CVT anomalies.',
    },
    {
      step: 3,
      name: 'Service',
      tag: 'Active Repair',
      height: 'h-40',
      summary: 'Active Mechanical Service & Parts Installation',
      desc: 'Oil flushed and replaced with certified fluids, CVT belt cleaned and degreased, brake calipers calibrated, and worn parts replaced with OEM components.',
    },
    {
      step: 4,
      name: 'Test',
      tag: 'Quality Test',
      height: 'h-28',
      summary: 'Road Testing & Performance Calibration',
      desc: 'Engine idle speed tuned, brake responsiveness tested, electrical lighting verified, and quality safety inspection conducted prior to release clearance.',
    },
    {
      step: 5,
      name: 'Ready',
      tag: 'Customer Pickup',
      height: 'h-36',
      summary: 'Service Complete & Counter Release',
      desc: 'Work verified by lead technician, replaced parts packaged for owner verification, official service invoice finalized, and vehicle ready for release.',
    },
  ];

  const inspectedStage = stages.find((s) => s.step === inspectedStageStep) || stages[0];

  // 6-Month Real Maintenance Activity Data computed from real serviceHistory
  const serviceActivityData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const count = serviceHistory.filter((item) => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        return itemDate.getFullYear() === year && itemDate.getMonth() === monthIdx;
      }).length;
      months.push({
        label: monthLabel,
        count,
        isCurrent: i === 0,
      });
    }
    return months;
  }, [serviceHistory]);

  const maxActivityCount = useMemo(() => {
    const max = Math.max(...serviceActivityData.map((m) => m.count));
    return max > 0 ? max : 1;
  }, [serviceActivityData]);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Header Greeting & Action Row */}
      <div className="flex flex-row items-center justify-between gap-3 px-1.5 sm:px-1">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-light text-slate-700 tracking-tight truncate">
            Welcome Back,{' '}
            <span className="font-semibold text-slate-900">
              {userProfile?.full_name?.split(' ')[0] || 'Rider'}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Action Pill */}
          <button
            type="button"
            onClick={() => onBookClick()}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm shadow-orange-500/20 flex items-center gap-1.5 transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Book Service</span>
          </button>
        </div>
      </div>

      {/* 1.5 Active Service Units Quick-Switcher (When customer has multiple concurrent bookings) */}
      {activeTickets.length > 1 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[1.75rem] p-3 sm:p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Ongoing Service Units
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] sm:text-xs font-bold border border-orange-200/60">
                  {activeTickets.length} Active
                </span>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              Select a vehicle to inspect live workshop stage
            </span>
          </div>

          <div
            className={`flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x sm:grid sm:overflow-visible sm:pb-0 ${
              activeTickets.length === 2
                ? 'sm:grid-cols-2'
                : activeTickets.length === 3
                ? 'sm:grid-cols-3'
                : 'sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {activeTickets.map((t, idx) => {
              const isSelected = t.id === activeTicket?.id;
              const isTicketReady = t.status === 'READY_FOR_PICKUP';
              const bikeLabel = t.motorcycles?.model || `Motorcycle ${idx + 1}`;
              const plateLabel = t.motorcycles?.plate_number || 'No Plate';

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-colors duration-150 cursor-pointer text-left min-w-[210px] sm:min-w-0 snap-start shrink-0 sm:shrink bg-white border-2 shadow-xs ${
                    isSelected
                      ? 'border-orange-500'
                      : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 border border-slate-200/60 shadow-2xs'
                    }`}
                  >
                    <Bike className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-bold truncate block ${
                          isSelected ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {bikeLabel}
                      </span>
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 transition-colors duration-150 ${
                          isTicketReady
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : isSelected
                            ? 'bg-orange-500 text-white font-extrabold shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isTicketReady ? 'Ready' : `Stage ${t.stage}`}
                      </span>
                    </div>
                    <div
                      className={`text-[10px] sm:text-[11px] font-mono truncate mt-0.5 ${
                        isSelected ? 'text-slate-500 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {plateLabel} • #{t.ticket_code}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Top Bento Grid Row (3 Cards: VIP Pass, Interactive Stage Stepper, Wavy Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Card 1: Active Service Unit / Motorcycle Bay Pass */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {activeTicket ? 'Active Service Unit' : 'Primary Motorcycle'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTicket ? 'Vehicle currently in repair' : 'Registered in garage fleet'}
            </p>
          </div>

          {/* Digital Motorcycle Garage Card */}
          <div
            className={`rounded-2xl p-5 text-white shadow-md relative overflow-hidden space-y-3.5 ${
              activeTicket
                ? 'bg-gradient-to-br from-orange-600 via-amber-700 to-slate-900'
                : 'bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950'
            }`}
          >
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold tracking-wider uppercase text-white/90 flex items-center gap-1.5">
                <Bike className="w-4 h-4" />
                {activeTicket ? 'Service Bay Pass' : 'Garage Vehicle Pass'}
              </span>
              {activeTicket ? (
                <Radio className="w-4 h-4 text-white/80 rotate-90" />
              ) : (
                <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-emerald-100 border border-white/20">
                  {primaryBike?.year_model ? `${primaryBike.year_model} Model` : 'Garage Unit'}
                </span>
              )}
            </div>

            <div className="relative z-10 space-y-0.5">
              <div className="text-[11px] text-white/80 font-medium uppercase tracking-wide">
                {activeBikeModel}
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {activeBikePlate}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/90 pt-2.5 border-t border-white/20 relative z-10">
              <div>
                <span className="text-white/60 text-[10px] block uppercase tracking-wider">
                  {activeTicket ? 'Ticket Ref' : 'Odometer'}
                </span>
                <span className="font-mono font-bold">
                  {activeTicket ? `#${activeTicket.ticket_code}` : primaryBike?.odometer || '0 km'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-white/60 text-[10px] block uppercase tracking-wider">
                  {activeTicket ? 'Assigned Bay' : 'Next Due'}
                </span>
                <span className="font-bold truncate block">
                  {activeTicket ? (activeTicket.assigned_bay || 'Bay Pending') : primaryBike?.next_service || '3,000 km'}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Workshop Summary (Eliminates empty white gaps on desktop) */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium text-xs">Workshop Bay Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                  activeTicket
                    ? isReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {activeTicket ? (isReady ? 'Ready for Pickup' : 'Bay In-Progress') : '100% Road Ready'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-600">
              <span className="text-slate-400">
                {activeTicket ? 'Lead Mechanic' : 'Vehicle Condition'}
              </span>
              <span className="font-bold text-slate-800">
                {activeTicket ? activeTicket.assigned_mechanic : 'Road-Ready'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400">
                {activeTicket ? 'Drop-off / Schedule' : 'Next PMS Due'}
              </span>
              <span className="font-bold text-slate-800">
                {activeTicket
                  ? activeTicket.dropoff_date || activeTicket.estimated_pickup || 'Standard Queue'
                  : primaryBike?.next_service || '3,000 km'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Workshop Progress (Clickable Stages & Booked Motorcycle Display) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Workshop Progress
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {activeTicket ? `${activeBikeModel} (${activeBikePlate})` : 'Click any stage to inspect details'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full text-[11px] font-medium text-slate-600">
                <span className="px-2.5 py-0.5 rounded-full">Stages</span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-semibold shadow-xs">
                  {activeTicket ? `Stage ${currentStage}` : 'Interactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Milestone Pillars (Clickable!) */}
          <div className="pt-2 sm:pt-3">
            <div className="flex items-end justify-between gap-1.5 sm:gap-2.5 h-36 sm:h-40 px-0.5 sm:px-2 pb-2">
              {stages.map((st) => {
                const isActivePillar = activeTicket
                  ? st.step === currentStage
                  : st.step === inspectedStageStep;
                const isPassedPillar = activeTicket ? st.step < currentStage : false;
                const isInspected = st.step === inspectedStageStep;

                return (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => setInspectedStageStep(st.step)}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer focus:outline-none min-w-0"
                    title={`Click to inspect Stage ${st.step}: ${st.name}`}
                  >
                    {/* Active Floating Badge (Centered perfectly via Flexbox wrapper) */}
                    {isActivePillar && (
                      <div className="absolute -top-4 left-0 right-0 flex justify-center pointer-events-none z-10">
                        <div className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[8px] sm:text-[10px] font-bold shadow-md flex items-center gap-1 whitespace-nowrap animate-bounce">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                          <span>{activeTicket ? (isReady && st.step === 5 ? 'Ready' : 'Current') : 'Selected'}</span>
                        </div>
                      </div>
                    )}

                    {/* Milestone Pillar Container */}
                    <div
                      className={`w-full rounded-2xl transition-all duration-300 relative flex flex-col justify-between items-center py-2 ${
                        isActivePillar
                          ? 'bg-gradient-to-b from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 h-28 sm:h-32 ring-2 ring-orange-500 ring-offset-2'
                          : isPassedPillar
                          ? isInspected
                            ? 'bg-orange-500 text-white shadow-xs h-24 sm:h-28 ring-2 ring-orange-400 ring-offset-1'
                            : 'bg-orange-500 text-white shadow-xs h-24 sm:h-28'
                          : isInspected
                          ? 'bg-slate-200 text-slate-700 h-24 sm:h-28 ring-2 ring-slate-400 ring-offset-1'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-400 border border-slate-200/70 h-24 sm:h-28'
                      }`}
                    >
                      {/* Top Stage Step Indicator */}
                      <span className={`text-[10px] font-bold ${
                        isActivePillar || isPassedPillar ? 'text-white' : 'text-slate-400'
                      }`}>
                        {isPassedPillar ? '✓' : st.step}
                      </span>

                      {/* Faint subtle pillar accent */}
                      <div className={`w-3 sm:w-4 h-1 rounded-full ${
                        isActivePillar || isPassedPillar ? 'bg-white/40' : 'bg-slate-300/60'
                      }`} />
                    </div>

                    {/* Stage Label Below Pillar (No Truncate, Guaranteed to show READY) */}
                    <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold uppercase mt-2 tracking-tight text-center leading-none transition ${
                      isInspected ? 'text-orange-600' : 'text-slate-500'
                    }`}>
                      {st.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Inspection Detail Box (Explains What is Done at this Stage) */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <strong className="text-slate-900 font-bold text-xs truncate">
                  Stage {inspectedStage.step}: {inspectedStage.summary}
                </strong>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 w-fit self-start sm:self-auto ${
                activeTicket
                  ? inspectedStage.step < currentStage
                    ? 'bg-orange-100 text-orange-800 border border-orange-200/60'
                    : inspectedStage.step === currentStage
                    ? 'bg-orange-500 text-white shadow-xs animate-pulse'
                    : 'bg-slate-200 text-slate-600'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {activeTicket
                  ? inspectedStage.step < currentStage
                    ? 'Completed ✓'
                    : inspectedStage.step === currentStage
                    ? 'In Progress ⚙'
                    : 'Upcoming ⏱'
                  : 'Stage Overview'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {inspectedStage.desc}
            </p>
          </div>

          {/* Booked Motorcycle Information Footer */}
          {activeTicket ? (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] block">Booked Vehicle</span>
                  <span className="font-bold text-slate-800 truncate block">{activeBikeModel}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Plate Number</span>
                  <span className="font-bold text-slate-800 block">{activeBikePlate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Assigned Bay</span>
                  <span className="font-bold text-slate-800 block">{activeTicket.assigned_bay}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Lead Mechanic</span>
                  <span className="font-bold text-slate-800 truncate block">{activeTicket.assigned_mechanic}</span>
                </div>
              </div>

              {/* Cancellation or Stage Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100/90 text-xs">
                <div className="text-[11px] text-slate-500 font-medium">
                  {activeTicket.dropoff_date ? (
                    <span>Drop-off Date: <strong className="text-slate-700">{activeTicket.dropoff_date}</strong></span>
                  ) : (
                    <span>Ticket Ref: <strong className="text-slate-700">#{activeTicket.ticket_code}</strong></span>
                  )}
                </div>

                {activeTicket.stage === 1 ? (
                  onRequestCancelTicket && (
                    <button
                      type="button"
                      onClick={() => onRequestCancelTicket(activeTicket)}
                      className="px-3 py-1 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                      title="Cancel this booking reservation"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cancel Reservation</span>
                    </button>
                  )
                ) : (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/50 self-start sm:self-auto">
                    In Active Service (Contact Advisor to Modify)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>All workshop service bays ready for booking</span>
              <span className="text-slate-400">0 Ongoing Maintenance</span>
            </div>
          )}
        </div>

        {/* Card 3: Service Records & Functional Activity Chart */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Service Records</h3>
            <p className="text-xs text-slate-400">Official maintenance history</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-medium">Completed Services</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {serviceHistory.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {serviceHistory.length === 1 ? 'Record Logged' : 'Records Logged'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {serviceHistory.length === 0
                ? 'No past services yet • Records log upon release'
                : `Latest: ${serviceHistory[0]?.service_type || 'Maintenance'}`}
            </p>
          </div>

          {/* Real Functional 6-Month Maintenance Activity Chart */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 text-[11px]">Monthly Visits</span>
              <span className="text-[10px] text-slate-400">Past 6 Months</span>
            </div>

            <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-16 pt-1 px-1">
              {serviceActivityData.map((m, idx) => {
                const heightPercent = m.count > 0 ? Math.max((m.count / maxActivityCount) * 100, 30) : 10;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    title={`${m.label}: ${m.count} ${m.count === 1 ? 'service' : 'services'} completed`}
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 pointer-events-none z-10">
                      <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                        {m.count} done
                      </span>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        m.count > 0
                          ? 'bg-orange-500 shadow-xs'
                          : m.isCurrent
                          ? 'bg-orange-200/80'
                          : 'bg-slate-200/80'
                      }`}
                    />

                    {/* Month Label */}
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 tracking-tight ${
                        m.isCurrent ? 'text-orange-600' : 'text-slate-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/60">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>{serviceHistory.length} Completed Total</span>
              </span>
              <span>Workshop Log</span>
            </div>
          </div>

          {/* Single Action Button: History Only (Light Green Theme) */}
          <button
            type="button"
            onClick={onViewHistoryClick}
            className="w-full bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-200/90 rounded-full py-2.5 px-4 text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>View Service Records</span>
          </button>
        </div>
      </div>

      {/* 3. Bottom Bento Grid Row (Service Records & Garage Fleet Milestone - NO FAKE SPECIALISTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bottom Left: Genuine Service History Table (NO HARDCODED ROWS) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Service History
              </h3>
              <p className="text-xs text-slate-400">Official verified workshop records from database</p>
            </div>
            <button
              type="button"
              onClick={onViewHistoryClick}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              View Full History →
            </button>
          </div>

          {/* Mobile Card List (< sm screens) */}
          <div className="sm:hidden space-y-2.5">
            {serviceHistory.length > 0 ? (
              serviceHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-600 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                      {item.ticket_code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900">{item.service_type}</div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-400">Total Billed</span>
                    <span className="font-bold text-slate-900">{item.total_estimate}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center space-y-1.5">
                <Clock className="w-7 h-7 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No Past Service Records Yet</div>
                <p className="text-[11px] text-slate-400">Verified official records will appear here.</p>
              </div>
            )}
          </div>

          {/* Desktop Table Container (>= sm screens) */}
          <div className="hidden sm:block overflow-x-auto">
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
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {item.total_estimate}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <div className="space-y-2 max-w-sm mx-auto">
                        <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="text-xs font-bold text-slate-700">No Past Service Records Yet</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          When your active service ticket is completed by our mechanics, verified official records and downloadable slips will appear here automatically.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right: Real Fleet Status & Next Service Milestone (NO FAKE SPECIALISTS) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5">
          {/* Sub-Card 1: Next Service Milestone */}
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-5 shadow-xs space-y-3">
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
                {primaryBike?.next_service || '3,000 km'}
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                On Schedule
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Assigned to: <strong className="text-slate-800">{activeBikeModel}</strong>
            </div>
          </div>

          {/* Sub-Card 2: Registered Garage Fleet Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">My Garage Fleet</h4>
                <p className="text-[11px] text-slate-400">Registered motorcycles ({motorcycles.length})</p>
              </div>
              <button
                type="button"
                onClick={() => onBookClick()}
                className="w-7 h-7 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center justify-center transition cursor-pointer"
                title="Add Motorcycle via Booking"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 pt-1 max-h-36 overflow-y-auto pr-1">
              {motorcycles.map((bike) => (
                <div
                  key={bike.id}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Bike className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">{bike.model}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{bike.plate_number}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBookClick(bike.id)}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Book
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
