import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Bike,
  ShieldCheck,
  Calendar,
  Radio,
  Loader2
} from 'lucide-react';

interface PublicTicket {
  id: string;
  ticket_code: string;
  service_type: string;
  stage: number;
  assigned_bay: string;
  assigned_mechanic: string;
  estimated_pickup: string;
  total_estimate: string;
  status: string;
  dropoff_date?: string;
  created_at: string;
  motorcycles?: {
    model: string;
    plate_number: string;
  } | null;
}

export default function TrackStatus() {
  const { ticketCode } = useParams<{ ticketCode?: string }>();
  const navigate = useNavigate();

  const [ticketDigits, setTicketDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTicket = async (codeToSearch: string) => {
    let cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) return;
    if (!cleanCode.startsWith('MC-')) {
      cleanCode = `MC-${cleanCode.replace(/\D/g, '')}`;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('service_tickets')
        .select(`
          id,
          ticket_code,
          service_type,
          stage,
          assigned_bay,
          assigned_mechanic,
          estimated_pickup,
          total_estimate,
          status,
          dropoff_date,
          created_at,
          motorcycles (
            model,
            plate_number
          )
        `)
        .eq('ticket_code', cleanCode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setTicket(null);
        setErrorMsg(`No service record found for ticket code "${cleanCode}". Please verify your ticket reference.`);
      } else {
        const rawBike: any = data.motorcycles;
        const bikeObj = Array.isArray(rawBike) ? rawBike[0] : rawBike;

        const formattedTicket: PublicTicket = {
          id: data.id,
          ticket_code: data.ticket_code,
          service_type: data.service_type,
          stage: data.stage,
          assigned_bay: data.assigned_bay,
          assigned_mechanic: data.assigned_mechanic,
          estimated_pickup: data.estimated_pickup,
          total_estimate: data.total_estimate,
          status: data.status,
          dropoff_date: data.dropoff_date,
          created_at: data.created_at,
          motorcycles: bikeObj || null,
        };

        setTicket(formattedTicket);
      }
    } catch (err: any) {
      console.error('Track lookup error:', err);
      setErrorMsg(err.message || 'Unable to fetch ticket details.');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketCode) {
      const cleanDigits = ticketCode.replace(/\D/g, '').slice(0, 6);
      setTicketDigits(cleanDigits);
      const normalizedCode = ticketCode.toUpperCase().startsWith('MC-')
        ? ticketCode.toUpperCase()
        : `MC-${cleanDigits}`;
      fetchTicket(normalizedCode);
    }
  }, [ticketCode]);

  // Live real-time updates for customers tracking their active service
  useEffect(() => {
    if (!ticket?.id && !ticket?.ticket_code) return;

    const currentTicketCode = ticket.ticket_code;
    const currentTicketId = ticket.id;

    const channel = supabase
      .channel(`public_track_realtime_${currentTicketCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
          filter: `id=eq.${currentTicketId}`,
        },
        () => {
          fetchTicket(currentTicketCode);
        }
      )
      .on(
        'broadcast',
        { event: 'TICKET_DISPATCH_SYNC' },
        (payload: any) => {
          if (
            payload?.payload?.ticket_code === currentTicketCode ||
            payload?.payload?.id === currentTicketId
          ) {
            fetchTicket(currentTicketCode);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, ticket?.ticket_code]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = ticketDigits.trim();
    if (!cleanDigits) return;
    const fullCode = `MC-${cleanDigits}`;
    navigate(`/track/${fullCode}`, { replace: true });
    fetchTicket(fullCode);
  };

  const stages = [
    {
      step: 1,
      name: 'Intake',
      desc: 'Unit Logged',
      guidance: 'Motorcycle checked in at MotoCare reception. Initial intake and mechanic inspection underway.',
    },
    {
      step: 2,
      name: 'Inspect',
      desc: 'Diagnostics',
      guidance: 'Comprehensive diagnostic scan and physical inspection underway. Advisor will prepare official parts estimate.',
    },
    {
      step: 3,
      name: 'Service',
      desc: 'Repair Work',
      guidance: 'Active service, parts replacement, and fluid replenishment currently in progress on the workshop bay.',
    },
    {
      step: 4,
      name: 'Test',
      desc: 'Road Test',
      guidance: 'Senior technician is conducting quality check, safety torquing, and calibration road testing.',
    },
    {
      step: 5,
      name: 'Ready',
      desc: 'Released',
      guidance: 'All workshop services completed! Motorcycle is cleaned and ready for counter collection at MotoCare reception.',
    },
  ];

  const isCompleted = ticket?.status === 'COMPLETED';
  const effectiveStage = isCompleted ? 5 : (ticket?.stage || 1);

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Navigation */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </div>

          <Link
            to="/login"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3.5 py-1.5 rounded-full border border-orange-200/80 transition"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Search Header */}
        <div className="text-center space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-orange-500" />
            Live Workshop Dispatch Tracker
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Track Your Motorcycle Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Enter your service ticket reference code to inspect real-time bay progress, assigned mechanic, and estimated pickup.
          </p>

          <form onSubmit={handleSearch} className="max-w-md mx-auto pt-2">
            <div className="relative flex items-center bg-white border border-slate-200/90 rounded-full shadow-xs focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition p-1.5 pl-3 sm:pl-3.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              
              {/* Permanent MC- Prefix Badge */}
              <div className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 font-bold font-mono text-xs select-none shrink-0 flex items-center mr-2">
                MC-
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={ticketDigits}
                onChange={(e) => setTicketDigits(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder=""
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-mono font-bold tracking-wider focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !ticketDigits.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 sm:px-5 py-2 rounded-full transition flex items-center gap-1 shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Track'}
              </button>
            </div>
          </form>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Ticket Details Card */}
        {ticket && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200/80 text-orange-600 text-xs font-bold font-mono">
                    #{ticket.ticket_code}
                  </span>
                  {isCompleted ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Completed & Released
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      In Workshop
                    </span>
                  )}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <Bike className="w-5 h-5 text-slate-400 shrink-0" />
                  <h2 className="text-base sm:text-xl font-bold text-slate-900">
                    {ticket.motorcycles?.model || 'Motorcycle Unit'}{' '}
                    <span className="text-slate-500 font-mono text-sm font-semibold">
                      ({ticket.motorcycles?.plate_number || 'N/A'})
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500">{ticket.service_type}</p>
              </div>

              <div className="p-3.5 sm:p-0 rounded-2xl bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200 sm:text-right space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-medium tracking-wider">
                  {isCompleted ? 'Completion Date' : 'Estimated Pickup'}
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {isCompleted ? 'Service Fully Rendered' : ticket.estimated_pickup}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Lead Mechanic:{' '}
                  <strong className="text-orange-600 font-semibold">{ticket.assigned_mechanic}</strong>
                </span>
              </div>
            </div>

            {/* Stepper */}
            <div className="space-y-3 py-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">
                  {isCompleted ? 'Final Workshop Status' : 'Live Repair Progress'}
                </span>
                <span className={`font-semibold ${isCompleted ? 'text-emerald-600 font-bold' : 'text-orange-600'}`}>
                  {isCompleted ? 'Completed (All 5 Stages Cleared)' : `Stage ${effectiveStage} of 5: ${stages[effectiveStage - 1]?.name}`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {stages.map((st) => {
                  const isDone = isCompleted || st.step < effectiveStage;
                  const isCurrent = !isCompleted && st.step === effectiveStage;

                  return (
                    <div key={st.step} className="space-y-1.5 text-center">
                      <div
                        className={`h-2.5 rounded-full transition-all flex items-center justify-center ${
                          isDone
                            ? 'bg-emerald-500'
                            : isCurrent
                            ? 'bg-orange-500 animate-pulse'
                            : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                          isDone
                            ? 'text-emerald-700'
                            : isCurrent
                            ? 'text-orange-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.name}
                      </div>
                      <div className="text-[9px] text-slate-400 hidden sm:block truncate">
                        {st.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3-Column Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                  Service Bay
                </span>
                <span className="font-bold text-slate-800 text-xs block">
                  {isCompleted ? 'Cleared & Released' : ticket.assigned_bay}
                </span>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                  {isCompleted ? 'Amount Settled' : 'Estimated Cost'}
                </span>
                <span className="font-extrabold text-emerald-600 text-sm font-mono block">
                  {ticket.total_estimate}
                </span>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                  Drop-off Date
                </span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.dropoff_date || new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Stage-Aware Workshop Status & Guidance (Privacy-Compliant) */}
            <div className="p-4 bg-orange-50/60 border border-orange-200/70 rounded-2xl text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                  Current Workshop Phase
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {isCompleted
                  ? 'All services completed! Motorcycle was officially released to customer.'
                  : stages[effectiveStage - 1]?.guidance}
              </p>
            </div>

            {/* Privacy Shield & Public Telemetry Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 text-[11px] text-slate-500 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Public Workshop Telemetry:</strong> Customer personal contact details and private instructions are protected and hidden.
              </span>
            </div>

            {/* Footer Validation */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Verified Workshop Record
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                MotoCare Service Hub
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}